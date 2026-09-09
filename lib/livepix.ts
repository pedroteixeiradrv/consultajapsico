/**
 * LivePix stub — pagamentos (mensalidade psicólogo, sessão, créditos).
 * Sem chaves reais nesta fase. Integrar LivePix depois.
 */

export type LivePixCheckoutInput = {
  amountCents: number;
  description: string;
  externalId: string;
  /** URL de retorno após pagamento */
  returnUrl?: string;
};

export type LivePixCheckoutResult = {
  ok: boolean;
  checkoutUrl?: string;
  providerRef?: string;
  error?: string;
};

export async function createCheckout(
  _input: LivePixCheckoutInput
): Promise<LivePixCheckoutResult> {
  // TODO: chamar API LivePix com LIVEPIX_API_KEY
  console.info("[livepix stub] createCheckout", _input);
  return {
    ok: true,
    checkoutUrl: "/stub/livepix-checkout",
    providerRef: `stub_${Date.now()}`,
  };
}

export async function verifyPayment(
  _providerRef: string
): Promise<{ paid: boolean }> {
  console.info("[livepix stub] verifyPayment", _providerRef);
  return { paid: false };
}
