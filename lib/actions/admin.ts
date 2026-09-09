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
