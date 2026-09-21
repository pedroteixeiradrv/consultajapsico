"use server";

import { redirect } from "next/navigation";
import { setSession, requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { mutateStore, readStore, newId, nowIso } from "@/lib/store";
import { isValidWhatsApp, normalizeWhatsApp } from "@/lib/whatsapp";
import {
  expiresIn30DaysIso,
  isStubPaymentsAllowed,
  subscriptionRef,
} from "@/lib/demo";
import { createCheckout, isLivePixConfigured } from "@/lib/livepix";
import { DEFAULT_PRICES } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/admin";

export async function psychRegisterAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const full_name = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const crp = String(formData.get("crp") ?? "").trim();
  const whatsappRaw = String(formData.get("whatsapp") ?? "").trim();
  const pix_key = String(formData.get("pixKey") ?? "").trim() || null;

  if (!full_name || !email || !password || !crp || !whatsappRaw) {
    return {
      ok: false,
      error: "Preencha nome, e-mail, senha, CRP e WhatsApp.",
    };
  }
  if (password.length < 6) {
    return { ok: false, error: "Senha deve ter ao menos 6 caracteres." };
  }
  if (!isValidWhatsApp(whatsappRaw)) {
    return {
      ok: false,
      error: "WhatsApp inválido. Use DDD+número ou +55…",
    };
  }
  const whatsapp = normalizeWhatsApp(whatsappRaw);

  const password_hash = await hashPassword(password);
  const id = newId();
  const now = nowIso();

  const result = await mutateStore((d) => {
    if (d.psychologists.some((p) => p.email === email)) {
      return { ok: false as const, error: "E-mail já cadastrado." };
    }
    d.psychologists.push({
      id,
      email,
      password_hash,
      full_name,
      crp,
      whatsapp,
      pix_key,
      subscription_status: "pending",
      subscription_expires_at: null,
      verification_status: "pending",
      online: false,
      payout_balance_cents: 0,
      created_at: now,
      updated_at: now,
    });
    return { ok: true as const };
  });

  if (!result.ok) return result;

  await setSession({ role: "psych", sub: id, email });
  redirect("/psych/dashboard");
}

export async function psychLoginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Preencha e-mail e senha." };

  const db = await readStore();
  const psych = db.psychologists.find((p) => p.email === email);
  if (!psych || !(await verifyPassword(password, psych.password_hash))) {
    return { ok: false, error: "Credenciais inválidas." };
  }
  await setSession({ role: "psych", sub: psych.id, email: psych.email });
  redirect("/psych/dashboard");
}

export async function toggleOnlineAction(): Promise<ActionResult> {
  const session = await requireSession("psych");
  await mutateStore((db) => {
    const p = db.psychologists.find((x) => x.id === session.sub);
    if (!p) throw new Error("Psicólogo não encontrado");
    p.online = !p.online;
    p.updated_at = nowIso();
  });
  return { ok: true };
}

export async function acceptRequestAction(
  requestId: string
): Promise<ActionResult & { requestId?: string }> {
  const session = await requireSession("psych");

  const result = await mutateStore((db) => {
    const psych = db.psychologists.find((p) => p.id === session.sub);
    if (!psych) return { ok: false as const, error: "Psicólogo não encontrado" };
    if (psych.verification_status !== "approved") {
      return {
        ok: false as const,
        error:
          "Seu CRP ainda não foi aprovado pelo admin. Você não pode aceitar filas.",
      };
    }
    if (!psych.online) {
      return {
        ok: false as const,
        error: "Fique online para aceitar a fila.",
      };
    }
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    if (!req.paid_at) {
      return { ok: false as const, error: "Pedido ainda não pago." };
    }
    if (req.status !== "pending" || req.psychologist_id) {
      return {
        ok: false as const,
        error: "Pedido já foi aceito por outro psicólogo.",
      };
    }
    const now = nowIso();
    req.status = "accepted";
    req.psychologist_id = psych.id;
    req.accepted_at = now;
    req.updated_at = now;
    return { ok: true as const, requestId };
  });

  if (result.ok) {
    redirect(`/call/${requestId}`);
  }
  return result;
}

export async function psychCompleteSessionAction(requestId: string) {
  await requireSession("psych");
  const { completeConsultation } = await import("@/lib/actions/session");
  return completeConsultation(requestId, "psych");
}

/**
 * Assinar 30 dias (alertas de e-mail). LivePix real; stub só em DEV/DEMO.
 */
export async function startSubscriptionCheckoutAction(): Promise<
  ActionResult & { checkoutUrl?: string }
> {
  const session = await requireSession("psych");
  const db = await readStore();
  const psych = db.psychologists.find((p) => p.id === session.sub);
  if (!psych) return { ok: false, error: "Psicólogo não encontrado" };

  const amount =
    db.platform_settings.monthly_fee_cents ?? DEFAULT_PRICES.monthlyFeeCents;
  const externalId = subscriptionRef(psych.id);

  if (!isLivePixConfigured()) {
    if (!isStubPaymentsAllowed()) {
      return {
        ok: false,
        error: "LivePix não configurado. Defina CLIENT_ID/SECRET em produção.",
      };
    }
    // DEV/DEMO stub: activate immediately
    await mutateStore((d) => {
      const p = d.psychologists.find((x) => x.id === session.sub);
      if (!p) return;
      p.subscription_status = "active";
      p.subscription_expires_at = expiresIn30DaysIso();
      p.updated_at = nowIso();
    });
    return { ok: true, checkoutUrl: "/psych/dashboard?sub=stub" };
  }

  const checkout = await createCheckout({
    amountCents: amount,
    description: "Mensalidade ConsultaJáPsico — alertas 30 dias",
    externalId,
    returnUrl: "/psych/dashboard?sub=return",
  });
  if (!checkout.ok || !checkout.checkoutUrl) {
    return { ok: false, error: checkout.error ?? "Falha ao criar checkout" };
  }
  return { ok: true, checkoutUrl: checkout.checkoutUrl };
}

/** @deprecated use startSubscriptionCheckoutAction */
export async function activateSubscriptionStubAction(): Promise<ActionResult> {
  if (!isStubPaymentsAllowed()) {
    return {
      ok: false,
      error: "Stub de mensalidade só em development ou DEMO=1.",
    };
  }
  const session = await requireSession("psych");
  await mutateStore((db) => {
    const p = db.psychologists.find((x) => x.id === session.sub);
    if (!p) throw new Error("not found");
    p.subscription_status = "active";
    p.subscription_expires_at = expiresIn30DaysIso();
    p.updated_at = nowIso();
  });
  return { ok: true };
}

/**
 * Redeem admin coupon → 30 days free subscription (no LivePix).
 * Compare case-insensitive trim; empty/null setting = disabled.
 */
export async function redeemSubscriptionCouponAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession("psych");
  const input = String(formData.get("couponCode") ?? "").trim();
  if (!input) return { ok: false, error: "Informe o cupom." };

  const result = await mutateStore((db) => {
    const configured = (db.platform_settings.subscription_coupon_code ?? "")
      .trim();
    if (!configured) {
      return { ok: false as const, error: "Cupom desativado." };
    }
    if (configured.toLowerCase() !== input.toLowerCase()) {
      return { ok: false as const, error: "Cupom inválido." };
    }
    const p = db.psychologists.find((x) => x.id === session.sub);
    if (!p) return { ok: false as const, error: "Psicólogo não encontrado" };
    p.subscription_status = "active";
    p.subscription_expires_at = expiresIn30DaysIso();
    p.updated_at = nowIso();
    db.email_log.push({
      id: newId(),
      to: p.email,
      subject: "Cupom de assinatura resgatado",
      reason: "coupon_redeem",
      created_at: nowIso(),
    });
    return { ok: true as const };
  });
  return result;
}
