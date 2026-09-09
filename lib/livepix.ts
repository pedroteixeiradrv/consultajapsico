/**
 * LivePix stub — pagamentos (mensalidade psicólogo, sessão, créditos).
 * Demo: use POST /api/payments/stub-confirm para simular webhook.
 */

export type LivePixCheckoutInput = {
  amountCents: number;
  description: string;
  externalId: string;
  returnUrl?: string;
};

export type LivePixCheckoutResult = {
  ok: boolean;
  checkoutUrl?: string;
  providerRef?: string;
  error?: string;
};

export async function createCheckout(
  input: LivePixCheckoutInput
): Promise<LivePixCheckoutResult> {
  console.info("[livepix stub] createCheckout", input);
  return {
    ok: true,
    checkoutUrl: `/client/dashboard?pay=${encodeURIComponent(input.externalId)}`,
    providerRef: `stub_${input.externalId}_${Date.now()}`,
  };
}

export async function verifyPayment(
  _providerRef: string
): Promise<{ paid: boolean }> {
  console.info("[livepix stub] verifyPayment", _providerRef);
  return { paid: false };
}

/** Simula confirmação de webhook LivePix (demo local). */
export type StubConfirmInput = {
  requestId: string;
  kind?: "consultation" | "subscription";
  psychologistId?: string;
};
