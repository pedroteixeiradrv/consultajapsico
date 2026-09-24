"use server";

import { redirect } from "next/navigation";
import { setSession, clearSession, requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { mutateStore, readStore, newId, nowIso } from "@/lib/store";

export type ActionResult = { ok: false; error: string } | { ok: true };

export async function adminSetupAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !password) return { ok: false, error: "Preencha e-mail e senha." };
  if (password !== passwordConfirm) {
    return { ok: false, error: "Senhas não conferem." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Senha deve ter ao menos 6 caracteres." };
  }

  const password_hash = await hashPassword(password);
  const id = newId();

  const result = await mutateStore((d) => {
    if (d.admins.length > 0) {
      return {
        ok: false as const,
        error: "Já existe um administrador. Segundo cadastro não é permitido.",
      };
    }
    d.admins.push({
      id,
      email,
      password_hash,
      created_at: nowIso(),
    });
    return { ok: true as const };
  });

  if (!result.ok) return result;

  await setSession({ role: "admin", sub: id, email });
  redirect("/admin");
}

export async function adminLoginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Preencha e-mail e senha." };

  const db = await readStore();
  const admin = db.admins.find((a) => a.email === email);
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return { ok: false, error: "Credenciais inválidas." };
  }
  await setSession({ role: "admin", sub: admin.id, email: admin.email });
  redirect("/admin");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function adminCompleteSessionAction(requestId: string) {
  await requireSession("admin");
  const { completeConsultation } = await import("@/lib/actions/session");
  return completeConsultation(requestId, "admin");
}


/** Approve / reject psychologist CRP verification */
export async function setPsychVerificationAction(
  psychId: string,
  status: "approved" | "rejected"
): Promise<ActionResult> {
  await requireSession("admin");
  await mutateStore((db) => {
    const p = db.psychologists.find((x) => x.id === psychId);
    if (!p) throw new Error("Psicólogo não encontrado");
    p.verification_status = status;
    p.updated_at = nowIso();
  });
  return { ok: true };
}

/** Admin releases HOLD session into eligible + enqueues payout */
export async function releasePayoutAction(
  requestId: string
): Promise<ActionResult> {
  await requireSession("admin");
  const { enqueuePsychPayout } = await import("@/lib/payout");

  const prep = await mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    if (req.status !== "completed") {
      return { ok: false as const, error: "Sessão não completed" };
    }
    if (req.payout_credited) {
      return { ok: false as const, error: "Payout já creditado" };
    }
    const now = nowIso();
    req.payout_release_status = "released";
    req.payout_withheld = false;
    req.attendance_confirmed_by_client = true;
    req.attendance_confirmed_at = req.attendance_confirmed_at ?? now;
    req.updated_at = now;
    const psych = db.psychologists.find((p) => p.id === req.psychologist_id);
    return {
      ok: true as const,
      psychologistId: req.psychologist_id!,
      amountCents: req.psych_cut_cents,
      pixKey: psych?.pix_key ?? "",
    };
  });
  if (!prep.ok) return prep;
  const payout = await enqueuePsychPayout({
    psychologistId: prep.psychologistId,
    consultationRequestId: requestId,
    amountCents: prep.amountCents,
    pixKey: prep.pixKey,
  });
  if (!payout.ok) return { ok: false, error: payout.error ?? "Falha payout" };
  return { ok: true };
}

/** Admin denies payout (investigação) */
export async function denyPayoutAction(
  requestId: string,
  reason?: string
): Promise<ActionResult> {
  await requireSession("admin");
  await mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) throw new Error("not found");
    req.payout_release_status = "denied";
    req.payout_withheld = true;
    req.payout_withheld_reason = reason?.trim() || "Negado pelo admin";
    req.updated_at = nowIso();
  });
  return { ok: true };
}

export async function markPayoutBatchPaidAction(
  formData: FormData
): Promise<ActionResult> {
  await requireSession("admin");
  const { markPayoutBatchPaid } = await import("@/lib/payout");
  const label = String(formData.get("label") ?? "").trim() || undefined;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const result = await markPayoutBatchPaid({ label, notes });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

/** Save or clear subscription coupon keyword (empty = disabled) */
export async function saveSubscriptionCouponAction(
  formData: FormData
): Promise<ActionResult> {
  await requireSession("admin");
  const raw = String(formData.get("couponCode") ?? "").trim();
  const code = raw.length === 0 ? null : raw;
  await mutateStore((db) => {
    db.platform_settings.subscription_coupon_code = code;
    db.platform_settings.updated_at = nowIso();
  });
  return { ok: true };
}

/** Send a Resend test email to the admin session email */
export async function sendTestEmailAction(
  formData?: FormData
): Promise<ActionResult> {
  const session = await requireSession("admin");
  const override = formData
    ? String(formData.get("email") ?? "").trim().toLowerCase()
    : "";
  const to = override || session.email;
  if (!to) return { ok: false, error: "E-mail de destino ausente." };
  const { sendEmail } = await import("@/lib/email");
  const result = await sendEmail({
    to,
    subject: "ConsultaJá teste",
    html: "<p>E-mail de teste do painel admin ConsultaJá. Se você recebeu isto, o Resend está OK.</p>",
    reason: "admin_test",
  });
  if (!result.ok) return { ok: false, error: result.error ?? "Falha ao enviar" };
  return { ok: true };
}

function parseReaisToCents(raw: string): number | null {
  const normalized = String(raw ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Admin updates consultation / mensalidade prices (reais → cents) */
export async function savePlatformPricesAction(
  formData: FormData
): Promise<ActionResult> {
  await requireSession("admin");

  const priceCents = parseReaisToCents(String(formData.get("priceReais") ?? ""));
  const psychCutCents = parseReaisToCents(
    String(formData.get("psychCutReais") ?? "")
  );
  const monthlyFeeCents = parseReaisToCents(
    String(formData.get("monthlyFeeReais") ?? "")
  );

  if (priceCents == null || psychCutCents == null || monthlyFeeCents == null) {
    return { ok: false, error: "Informe valores numéricos válidos em reais." };
  }
  if (priceCents <= 0) {
    return { ok: false, error: "O preço cobrado deve ser maior que zero." };
  }
  if (psychCutCents < 0) {
    return { ok: false, error: "O repasse não pode ser negativo." };
  }
  if (psychCutCents > priceCents) {
    return {
      ok: false,
      error: "O repasse não pode ser maior que o preço cobrado.",
    };
  }
  if (monthlyFeeCents < 0) {
    return { ok: false, error: "A mensalidade não pode ser negativa." };
  }

  await mutateStore((db) => {
    db.platform_settings.price_id_cents = priceCents;
    db.platform_settings.psych_cut_id_cents = psychCutCents;
    db.platform_settings.monthly_fee_cents = monthlyFeeCents;
    db.platform_settings.updated_at = nowIso();
  });
  return { ok: true };
}
