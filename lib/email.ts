/**
 * E-mail stub (Resend) — notificações opcionais.
 * Fila de psicólogos é ONLINE + aceitar pending, NÃO e-mail-only.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(
  _input: SendEmailInput
): Promise<{ ok: boolean; error?: string }> {
  // TODO: Resend com RESEND_API_KEY
  console.info("[email stub] sendEmail", _input.to, _input.subject);
  return { ok: true };
}
