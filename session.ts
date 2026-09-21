"use server";

import { mutateStore, nowIso } from "@/lib/store";
import { notifyActivePsychsOfNewRequest } from "@/lib/email";
import { enqueuePsychPayout } from "@/lib/payout";
import type { ActionResult } from "@/lib/actions/admin";

export async function markConsultationPaid(
  requestId: string,
  clientId: string,
  opts?: { paidAmountCents?: number | null }
): Promise<ActionResult & { detail?: string }> {
  const result = await mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    if (req.client_id !== clientId) {
      return { ok: false as const, error: "Pedido não pertence a você" };
    }
    if (req.paid_at) return { ok: true as const };
    if (req.status !== "pending") {
      return { ok: false as const, error: "Status inválido para pagamento" };
    }

    const paidAmt = opts?.paidAmountCents;
    if (paidAmt != null && paidAmt !== req.price_cents) {
      const now = nowIso();
      req.payment_mismatch_cents = paidAmt;
      req.cancel_reason =
        `amount_mismatch: paid ${paidAmt} expected ${req.price_cents}`;
      req.updated_at = now;
      console.warn(
        "[payment] amount mismatch; not marking paid",
        requestId,
        paidAmt,
        req.price_cents
      );
      return {
        ok: false as const,
        error: "amount_mismatch",
        detail: "amount_mismatch",
      };
    }

    const now = nowIso();
    req.paid_at = now;
    req.payment_mismatch_cents = null;
    req.updated_at = now;

    db.credits_ledger.push({
      id: crypto.randomUUID(),
      client_id: clientId,
      amount_cents: -req.price_cents,
      reason: "session_charge",
      consultation_request_id: requestId,
      created_at: now,
    });
    return { ok: true as const };
  });

  if (result.ok) {
    await notifyActivePsychsOfNewRequest(requestId);
  }
  return result;
}

/**
 * Encerrar sessão (psych / timer / admin).
 * NÃO credita payout — aguarda confirmação do cliente (ou review admin).
 */
export async function completeConsultation(
  requestId: string,
  by: "psych" | "admin" | "timer"
): Promise<ActionResult> {
  return mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    if (req.status === "completed") {
      return { ok: true as const };
    }
    if (req.status !== "accepted" && req.status !== "in_call") {
      return {
        ok: false as const,
        error: `Status ${req.status} não permite encerrar`,
      };
    }
    if (!req.psychologist_id) {
      return { ok: false as const, error: "Sem psicólogo atribuído" };
    }
    if (!req.paid_at) {
      return { ok: false as const, error: "Pedido não pago" };
    }
    const now = nowIso();
    if (req.status === "accepted") {
      req.call_started_at = req.call_started_at ?? now;
    }
    req.status = "completed";
    req.completed_at = now;
    req.payout_release_status = "pending_client";
    req.updated_at = now;
    console.info("[session] completed without payout credit", requestId, by);
    return { ok: true as const };
  });
}

/** Marca in_call quando entra na sala. */
export async function markInCallAction(
  requestId: string
): Promise<ActionResult> {
  await mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return;
    if (req.status === "accepted") {
      const now = nowIso();
      req.status = "in_call";
      req.call_started_at = req.call_started_at ?? now;
      req.updated_at = now;
    }
  });
  return { ok: true };
}

export async function completeSessionUiAction(
  requestId: string
): Promise<ActionResult> {
  const { getSession } = await import("@/lib/auth");
  const { readStore } = await import("@/lib/store");
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  const db = await readStore();
  const req = db.consultation_requests.find((r) => r.id === requestId);
  if (!req) return { ok: false, error: "Pedido não encontrado" };

  if (session.role === "admin") {
    return completeConsultation(requestId, "admin");
  }
  if (session.role === "psych") {
    if (req.psychologist_id !== session.sub) {
      return { ok: false, error: "Não é o psicólogo desta sessão" };
    }
    return completeConsultation(requestId, "psych");
  }
  if (session.role === "client") {
    if (req.client_id !== session.sub) {
      return { ok: false, error: "Não é o cliente desta sessão" };
    }
    // Client ending via timer path still only completes — confirm is separate
    const started = req.call_started_at
      ? new Date(req.call_started_at).getTime()
      : req.accepted_at
        ? new Date(req.accepted_at).getTime()
        : 0;
    const elapsed = Date.now() - started;
    if (elapsed < 30 * 60 * 1000 && req.status !== "completed") {
      // allow client to open post-session UI only after complete by psych/timer
      // but if already completed, fall through to refresh
    }
    if (req.status !== "completed") {
      if (elapsed < 30 * 60 * 1000) {
        return {
          ok: false,
          error: "Aguarde o psicólogo encerrar, ou o timer de 30 min.",
        };
      }
      return completeConsultation(requestId, "timer");
    }
    return { ok: true };
  }
  return { ok: false, error: "Acesso negado" };
}

function clampRating(n: unknown): number | null {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return null;
  const r = Math.round(v);
  if (r < 1 || r > 5) return null;
  return r;
}

/**
 * Cliente confirma atendimento (checkbox obrigatório) + rating opcional.
 * Só então a sessão fica eligible e o payout é enfileirado para o lote 10/28.
 */
export async function confirmAttendanceAction(
  requestId: string,
  opts: {
    confirmed: boolean;
    rating?: number | null;
    comment?: string | null;
  }
): Promise<ActionResult> {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session || session.role !== "client") {
    return { ok: false, error: "Somente o cliente pode confirmar" };
  }
  if (!opts.confirmed) {
    return {
      ok: false,
      error: 'Marque "Confirmo que o atendimento foi realizado".',
    };
  }

  const rating = opts.rating != null ? clampRating(opts.rating) : null;
  const comment = opts.comment?.trim() || null;

  const prep = await mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    if (req.client_id !== session.sub) {
      return { ok: false as const, error: "Pedido não pertence a você" };
    }
    if (req.status !== "completed") {
      return { ok: false as const, error: "Sessão ainda não foi encerrada" };
    }
    if (req.sac_linked_at || req.payout_release_status === "needs_admin_review") {
      return {
        ok: false as const,
        error:
          "Há um SAC ou revisão admin nesta sessão — o repasse fica em análise.",
      };
    }
    if (req.attendance_confirmed_by_client && req.payout_credited) {
      return { ok: true as const, already: true as const };
    }
    const now = nowIso();
    req.attendance_confirmed_by_client = true;
    req.attendance_confirmed_at = now;
    req.client_rating_of_psych = rating;
    req.client_rating_comment = comment;
    req.payout_release_status = "eligible";
    req.updated_at = now;
    const psych = db.psychologists.find((p) => p.id === req.psychologist_id);
    return {
      ok: true as const,
      already: false as const,
      psychologistId: req.psychologist_id!,
      amountCents: req.psych_cut_cents,
      pixKey: psych?.pix_key ?? "",
    };
  });

  if (!prep.ok) return prep;
  if ("already" in prep && prep.already) return { ok: true };

  const payout = await enqueuePsychPayout({
    psychologistId: (prep as { psychologistId: string }).psychologistId,
    consultationRequestId: requestId,
    amountCents: (prep as { amountCents: number }).amountCents,
    pixKey: (prep as { pixKey: string }).pixKey,
  });
  if (!payout.ok) {
    return { ok: false, error: payout.error ?? "Falha ao enfileirar payout" };
  }
  return { ok: true };
}

/** Psicólogo avalia o cliente (opcional) após sessão completed. */
export async function rateClientAction(
  requestId: string,
  opts: { rating?: number | null; comment?: string | null }
): Promise<ActionResult> {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session || session.role !== "psych") {
    return { ok: false, error: "Somente o psicólogo pode avaliar o cliente" };
  }
  const rating = opts.rating != null ? clampRating(opts.rating) : null;
  const comment = opts.comment?.trim() || null;

  return mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    if (req.psychologist_id !== session.sub) {
      return { ok: false as const, error: "Não é o psicólogo desta sessão" };
    }
    if (req.status !== "completed") {
      return { ok: false as const, error: "Sessão ainda não encerrada" };
    }
    const now = nowIso();
    req.psych_rating_of_client = rating;
    req.psych_rating_comment = comment;
    req.updated_at = now;
    return { ok: true as const };
  });
}

/**
 * Abre SAC vinculado à consulta e coloca payout em HOLD / needs_admin_review.
 */
export async function openSessionSacAction(
  requestId: string,
  opts: { subject?: string; body?: string }
): Promise<ActionResult & { ticketId?: string }> {
  const { getSession } = await import("@/lib/auth");
  const { newId } = await import("@/lib/store");
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  return mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    const allowed =
      (session.role === "client" && req.client_id === session.sub) ||
      (session.role === "psych" && req.psychologist_id === session.sub) ||
      session.role === "admin";
    if (!allowed) return { ok: false as const, error: "Acesso negado" };

    const now = nowIso();
    const ticketId = newId();
    db.sac_tickets.push({
      id: ticketId,
      requester_email: session.email,
      subject:
        opts.subject?.trim() ||
        `SAC do atendimento ${requestId.slice(0, 8)}`,
      body:
        opts.body?.trim() ||
        "Solicitação de suporte / contestação aberta ao final da sessão.",
      consultation_request_id: requestId,
      proof_note: null,
      status: "open",
      admin_notes: null,
      created_at: now,
      updated_at: now,
    });
    req.sac_linked_at = now;
    req.payout_release_status = "needs_admin_review";
    req.payout_withheld = true;
    req.payout_withheld_reason =
      req.payout_withheld_reason || "SAC aberto para este atendimento";
    // If payout was already credited somehow, leave admin to reverse manually
    req.updated_at = now;
    return { ok: true as const, ticketId };
  });
}
