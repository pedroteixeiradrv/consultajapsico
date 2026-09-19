import { isStubPaymentsAllowed } from "@/lib/demo";

export type LivePixCheckoutInput = { amountCents: number; description: string; externalId: string; returnUrl?: string };
export type LivePixCheckoutResult = { ok: boolean; checkoutUrl?: string; providerRef?: string; mode?: "live" | "stub"; error?: string };

export function getLivePixEnv() {
  return {
    clientId: process.env.LIVEPIX_CLIENT_ID_CONSULTAJA?.trim() || process.env.LIVEPIX_CLIENT_ID?.trim() || "",
    clientSecret: process.env.LIVEPIX_CLIENT_SECRET_CONSULTAJA?.trim() || process.env.LIVEPIX_CLIENT_SECRET?.trim() || "",
    apiKey: process.env.LIVEPIX_API_KEY?.trim() || "",
    webhookSecret: process.env.LIVEPIX_WEBHOOK_SECRET?.trim() || "",
  };
}
export function isLivePixConfigured(): boolean {
  const e = getLivePixEnv(); return Boolean(e.clientId && e.clientSecret);
}

export async function createCheckout(input: LivePixCheckoutInput): Promise<LivePixCheckoutResult> {
  if (!isStubPaymentsAllowed() && !isLivePixConfigured()) return { ok: false, error: "LivePix não configurado." };
  const path = input.returnUrl || "/client/dashboard";
  const sep = path.includes("?") ? "&" : "?";
  return { ok: true, checkoutUrl: `${path}${sep}pay=${encodeURIComponent(input.externalId)}`, providerRef: `stub_${input.externalId}_${Date.now()}`, mode: "stub" };
}
export async function verifyPayment(_providerRef: string): Promise<{ paid: boolean; raw?: unknown }> { return { paid: false }; }
export type StubConfirmInput = { requestId: string; kind?: "consultation" | "subscription"; psychologistId?: string };
