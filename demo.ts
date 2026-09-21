/**
 * Stub / demo payment path — only in development or explicit DEMO flag.
 * Production must use LivePix create + webhook.
 */

export function isStubPaymentsAllowed(): boolean {
  if (process.env.DEMO === "1" || process.env.DEMO === "true") return true;
  return process.env.NODE_ENV === "development";
}

export function hasActiveSubscription(opts: {
  subscription_status: string;
  subscription_expires_at: string | null | undefined;
}): boolean {
  if (opts.subscription_status !== "active") return false;
  if (!opts.subscription_expires_at) return false;
  return new Date(opts.subscription_expires_at).getTime() > Date.now();
}

export function subscriptionRef(psychologistId: string): string {
  return `sub:${psychologistId}:${Date.now()}`;
}

export function parseSubscriptionRef(
  reference: string
): { psychologistId: string } | null {
  if (!reference.startsWith("sub:")) return null;
  const parts = reference.split(":");
  if (parts.length < 2 || !parts[1]) return null;
  return { psychologistId: parts[1] };
}

/** Add 30 days to now (ISO). */
export function expiresIn30DaysIso(from = new Date()): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString();
}
