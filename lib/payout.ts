/**
 * Payout Pix ao psicólogo — SOMENTE após sessão completed / timer 30min.
 * Nunca pagar no accept nem no pending.
 */
import { mutateStore, newId, nowIso } from "@/lib/store";

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
 * Credita payout_balance e registra payout.
 * Chamar apenas quando consultation_requests.status = 'completed'.
 */
export async function enqueuePsychPayout(
  input: PayoutInput
): Promise<PayoutResult> {
  console.info("[payout] enqueuePsychPayout AFTER completed", input);
  return mutateStore((db) => {
    const req = db.consultation_requests.find(
      (r) => r.id === input.consultationRequestId
    );
    if (!req) return { ok: false, error: "Pedido não encontrado" };
    if (req.status !== "completed") {
      return { ok: false, error: "Sessão ainda não completed" };
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
      status: "paid",
      provider_ref: `stub_payout_${Date.now()}`,
      created_at: now,
      paid_at: now,
    });
    psych.payout_balance_cents += input.amountCents;
    psych.updated_at = now;
    req.payout_credited = true;
    req.updated_at = now;
    return { ok: true, payoutId };
  });
}

export async function processPendingPayouts(): Promise<{ processed: number }> {
  console.info("[payout stub] processPendingPayouts");
  return { processed: 0 };
}
