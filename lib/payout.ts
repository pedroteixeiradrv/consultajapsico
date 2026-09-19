/**
 * Payout Pix ao psicólogo — SOMENTE após client confirmar atendimento.
 * Sem transferência automática LivePix: credita saldo owed (pending) e
 * admin marca lote pago tipicamente nos dias 10 e 28.
 */
import { mutateStore, newId, nowIso, readStore } from "@/lib/store";
import type { PayoutBatch } from "@/lib/types";

export type PayoutInput = {
  psychologistId: string;
  consultationRequestId: string;
  amountCents: number;
  pixKey: string;
};

export type PayoutResult = {
  ok: boolean;
  payoutId?: string;
  error?: string;
};

/**
 * Credita payout_balance e registra payout pending (a pagar no lote).
 * Pré-condições: completed + attendance confirmed + eligible/released + not withheld.
 */
export async function enqueuePsychPayout(
  input: PayoutInput
): Promise<PayoutResult> {
  console.info("[payout] enqueuePsychPayout AFTER client confirm", {
    psychologistId: input.psychologistId,
    consultationRequestId: input.consultationRequestId,
    amountCents: input.amountCents,
  });
  return mutateStore((db) => {
    const req = db.consultation_requests.find(
      (r) => r.id === input.consultationRequestId
    );
    if (!req) return { ok: false, error: "Pedido não encontrado" };
    if (req.status !== "completed") {
      return { ok: false, error: "Sessão ainda não completed" };
    }
    if (!req.attendance_confirmed_by_client) {
      return { ok: false, error: "Cliente ainda não confirmou o atendimento" };
    }
    if (
      req.payout_release_status !== "eligible" &&
      req.payout_release_status !== "released"
    ) {
      return {
        ok: false,
        error: `Payout não liberado (status=${req.payout_release_status})`,
      };
    }
    if (req.payout_withheld) {
      return { ok: false, error: "Payout retido pelo admin" };
    }
    if (req.payout_credited) {
      return { ok: false, error: "Payout já creditado" };
    }
    const psych = db.psychologists.find((p) => p.id === input.psychologistId);
    if (!psych) return { ok: false, error: "Psicólogo não encontrado" };

    const payoutId = newId();
    const now = nowIso();
    db.payouts.push({
      id: payoutId,
      psychologist_id: input.psychologistId,
      consultation_request_id: input.consultationRequestId,
      amount_cents: input.amountCents,
      pix_key: input.pixKey || psych.pix_key || "sem-chave",
      status: "pending",
      provider_ref: null,
      payout_batch_id: null,
      created_at: now,
      paid_at: null,
    });
    psych.payout_balance_cents += input.amountCents;
    psych.updated_at = now;
    req.payout_credited = true;
    req.updated_at = now;
    return { ok: true, payoutId };
  });
}

export type OwedRow = {
  psychologistId: string;
  fullName: string;
  pixKey: string | null;
  owedCents: number;
  pendingPayoutIds: string[];
};

export async function listOwedByPsych(): Promise<OwedRow[]> {
  const db = await readStore();
  const map = new Map<string, OwedRow>();
  for (const p of db.payouts) {
    if (p.status !== "pending") continue;
    const psych = db.psychologists.find((x) => x.id === p.psychologist_id);
    const row = map.get(p.psychologist_id) ?? {
      psychologistId: p.psychologist_id,
      fullName: psych?.full_name ?? p.psychologist_id.slice(0, 8),
      pixKey: psych?.pix_key ?? p.pix_key,
      owedCents: 0,
      pendingPayoutIds: [],
    };
    row.owedCents += p.amount_cents;
    row.pendingPayoutIds.push(p.id);
    map.set(p.psychologist_id, row);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );
}

/** Cria lote e marca payouts pending como paid (dias 10/28). */
export async function markPayoutBatchPaid(opts: {
  label?: string;
  notes?: string;
  psychologistIds?: string[];
}): Promise<{ ok: true; batch: PayoutBatch } | { ok: false; error: string }> {
  return mutateStore((db) => {
    const now = nowIso();
    const day = new Date().getDate();
    const defaultLabel =
      day <= 15
        ? `Lote dia 10 — ${now.slice(0, 7)}`
        : `Lote dia 28 — ${now.slice(0, 7)}`;
    const filterIds = opts.psychologistIds
      ? new Set(opts.psychologistIds)
      : null;

    const pending = db.payouts.filter((p) => {
      if (p.status !== "pending") return false;
      if (filterIds && !filterIds.has(p.psychologist_id)) return false;
      return true;
    });
    if (pending.length === 0) {
      return {
        ok: false as const,
        error: "Nenhum payout pendente neste filtro.",
      };
    }

    const batchId = newId();
    let total = 0;
    for (const p of pending) {
      p.status = "paid";
      p.paid_at = now;
      p.payout_batch_id = batchId;
      p.provider_ref = p.provider_ref || `batch_${batchId.slice(0, 8)}`;
      total += p.amount_cents;
      const psych = db.psychologists.find((x) => x.id === p.psychologist_id);
      if (psych) psych.updated_at = now;
    }

    const batch: PayoutBatch = {
      id: batchId,
      label: opts.label?.trim() || defaultLabel,
      status: "paid",
      total_cents: total,
      notes: opts.notes?.trim() || null,
      created_at: now,
      paid_at: now,
    };
    if (!db.payout_batches) db.payout_batches = [];
    db.payout_batches.push(batch);
    return { ok: true as const, batch };
  });
}

export async function processPendingPayouts(): Promise<{ processed: number }> {
  console.info(
    "[payout] processPendingPayouts — sem transfer API; use admin lote 10/28"
  );
  return { processed: 0 };
}
