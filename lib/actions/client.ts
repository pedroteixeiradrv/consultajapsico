"use server";

import { redirect } from "next/navigation";
import { setSession, requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { mutateStore, readStore, newId, nowIso } from "@/lib/store";
import { DEFAULT_PRICES } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/admin";
import { isStubPaymentsAllowed } from "@/lib/demo";

export async function clientRegisterAction(
    _prev: ActionResult | null,
    formData: FormData
  ): Promise<ActionResult> {
    const full_name = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");

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
        if (d.clients.some((c) => c.email === email)) {
                return { ok: false as const, error: "E-mail já cadastrado." };
        }
        d.clients.push({
                id,
                email,
                password_hash,
                full_name,
                credits_cents: 0,
                created_at: now,
                updated_at: now,
        });
        return { ok: true as const };
  });

  if (!result.ok) return result;

  await setSession({ role: "client", sub: id, email });
    redirect("/client/dashboard");
}

export async function clientLoginAction(
    _prev: ActionResult | null,
    formData: FormData
  ): Promise<ActionResult> {
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) return { ok: false, error: "Preencha e-mail e senha." };

  const db = await readStore();
    const client = db.clients.find((c) => c.email === email);
    if (!client || !(await verifyPassword(password, client.password_hash))) {
          return { ok: false, error: "Credenciais invlidas." };
    }
    await setSession({ role: "client", sub: client.id, email: client.email });
    redirect("/client/dashboard");
}

export async function createConsultationAction(): Promise<
    ActionResult & { requestId?: string }
  > {
    const session = await requireSession("client");
    const db = await readStore();
    const settings = db.platform_settings;
    const price = settings.price_id_cents ?? DEFAULT_PRICES.priceIdCents;
    const cut = settings.psych_cut_id_cents ?? DEFAULT_PRICES.psychCutIdCents;

  const id = newId();
    const now = nowIso();
    await mutateStore((d) => {
          d.consultation_requests.push({
                  id,
                  status: "pending",
                  client_id: session.sub,
                  psychologist_id: null,
                  price_cents: price,
                  psych_cut_cents: cut,
                  paid_at: null,
                  accepted_at: null,
                  call_started_at: null,
                  completed_at: null,
                  cancelled_at: null,
                  cancel_reason: null,
                  refund_requested: false,
                  refunded_at: null,
                  payout_credited: false,
                  attendance_confirmed_by_client: false,
                  attendance_confirmed_at: null,
                  client_rating_of_psych: null,
                  client_rating_comment: null,
                  psych_rating_of_client: null,
                  psych_rating_comment: null,
                  payout_release_status: "pending_client",
                  sac_linked_at: null,
                  payout_withheld: false,
                  payout_withheld_reason: null,
                  created_at: now,
                  updated_at: now,
          });
    });

  redirect(`/client/dashboard?pay=${id}`);
}

export async function confirmStubPaymentAction(
    requestId: string
  ): Promise<ActionResult> {
    if (!isStubPaymentsAllowed()) {
          return {
                  ok: false,
                  error: "Pagamento stub só em development ou DEMO=1. Use LivePix.",
          };
    }
    const session = await requireSession("client");
    const { markConsultationPaid } = await import("@/lib/actions/session");
    const result = await markConsultationPaid(requestId, session.sub);
    if (!result.ok) return result;
    redirect(`/standby/${requestId}`);
}
