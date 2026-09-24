/**
 * E-mail — Resend when RESEND_API_KEY + EMAIL_FROM set; else log only.
 * Fila de psicólogos é ONLINE + aceitar pending, NÃO e-mail-only.
 * Mensalidade: active AND subscription_expires_at > now → blast de nova solicitação.
 */
import { mutateStore, newId, nowIso } from "@/lib/store";
import { hasActiveSubscription } from "@/lib/demo";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  reason?: string;
};

function resendConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()
  );
}

export async function sendEmail(
  input: SendEmailInput
): Promise<{ ok: boolean; error?: string }> {
  await mutateStore((db) => {
    db.email_log.push({
      id: newId(),
      to: input.to,
      subject: input.subject,
      reason: input.reason ?? "generic",
      created_at: nowIso(),
    });
  });

  if (!resendConfigured()) {
    console.info(
      "[email] log-only (no RESEND_API_KEY/EMAIL_FROM)",
      input.to,
      input.subject,
      input.reason
    );
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM!.trim(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[email] Resend failed", res.status, text.slice(0, 400));
      let detail = "";
      try {
        const j = JSON.parse(text) as { message?: string; name?: string };
        detail = j.message || j.name || "";
      } catch {
        detail = text.slice(0, 160);
      }
      return {
        ok: false,
        error: detail
          ? `Resend ${res.status}: ${detail}`
          : `Resend ${res.status}`,
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Resend error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha e-mail",
    };
  }
}

/**
 * Avisa só psicólogos com mensalidade active e não expirada.
 * Online sem mensalidade NÃO recebe e-mail, mas ainda pode Aceitar na fila.
 */
export async function notifyActivePsychsOfNewRequest(requestId: string) {
  const { readStore } = await import("@/lib/store");
  const db = await readStore();
  const active = db.psychologists.filter((p) =>
    hasActiveSubscription({
      subscription_status: p.subscription_status,
      subscription_expires_at: p.subscription_expires_at,
    })
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
      "[email] no active+unexpired subscription psychs — skipping blast for",
      requestId
    );
  }
}
