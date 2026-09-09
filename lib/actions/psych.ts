"use server";

import { redirect } from "next/navigation";
import { setSession, requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { mutateStore, readStore, newId, nowIso } from "@/lib/store";
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
  const crp = String(formData.get("crp") ?? "").trim() || null;
  const pix_key = String(formData.get("pixKey") ?? "").trim() || null;

  if (!full_name || !email || !password) {
    return { ok: false, error: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Senha deve ter ao menos 6 caracteres." };
  }

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
      pix_key,
      subscription_status: "pending",
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

/** Demo: ativar mensalidade stub (sem LivePix real). */
export async function activateSubscriptionStubAction(): Promise<ActionResult> {
  const session = await requireSession("psych");
  await mutateStore((db) => {
    const p = db.psychologists.find((x) => x.id === session.sub);
    if (!p) throw new Error("not found");
    p.subscription_status = "active";
    p.updated_at = nowIso();
  });
  return { ok: true };
}
