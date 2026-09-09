/**
 * Payout Pix ao psicólogo — SOMENTE após sessão completed / timer 30min.
 * Nunca pagar no accept nem no pending.
 */

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
 * Credita payout_balance e registra payout pendente.
 * Chamar apenas quando consultation_requests.status = 'completed'.
 */
export async function enqueuePsychPayout(
  input: PayoutInput
): Promise<PayoutResult> {
  // TODO: gravar em `payouts`, debitar lógica de saldo, disparar Pix (LivePix)
  // IMPORTANTE: só após completed / 30min timer
  console.info("[payout stub] enqueuePsychPayout AFTER completed", input);
  return {
    ok: true,
    payoutId: `stub_payout_${Date.now()}`,
  };
}

export async function processPendingPayouts(): Promise<{ processed: number }> {
  console.info("[payout stub] processPendingPayouts");
  return { processed: 0 };
}
