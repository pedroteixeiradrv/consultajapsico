/**
 * E-mail stub (Resend) — notificações opcionais.
 * Fila de psicólogos é ONLINE + aceitar pending, NÃO e-mail-only.
 * Mensalidade: sem subscription active → NÃO registra e-mail de nova solicitação.
 */
import { mutateStore, newId, nowIso } from "@/lib/store";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  reason?: string;
};

export async function sendEmail(
  input: SendEmailInput
): Promise<{ ok: boolean; error?: string }> {
  console.info("[email stub] sendEmail", input.to, input.subject, input.reason);
  await mutateStore((db) => {
    db.email_log.push({
      id: newId(),
      to: input.to,
      subject: input.subject,
      reason: input.reason ?? "generic",
      created_at: nowIso(),
    });
  });
  return { ok: true };
}

/**
 * Avisa só psicólogos com mensalidade active.
 * Online sem mensalidade NÃO recebe e-mail, mas ainda pode Aceitar na fila.
 */
export async function notifyActivePsychsOfNewRequest(requestId: string) {
  const { readStore } = await import("@/lib/store");
  const db = await readStore();
  const active = db.psychologists.filter(
    (p) => p.subscription_status === "active"
  );
  for (const p of active) {
    await sendEmail({
      to: p.email,
      subject: `Nova solicitação na fila — ${requestId.slice(0, 8)}`,
      html: `<p>Há um pedido pendente pago. Entre no painel e Aceite se estiver online.</p>`,
      reason: "new_request_blast",
    });
  }
  if (active.length === 0) {
    console.info(
      "[email stub] no active-subscription psychs — skipping blast for",
      requestId
    );
  }
}
