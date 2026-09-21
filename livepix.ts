/**
 * LivePix client — real OAuth2 + payments API when credentials are set;
 * stub checkout otherwise (demo via /api/payments/stub-confirm).
 *
 * Prefers CONSULTAJA-specific env vars, then shared LIVEPIX_* fallbacks.
 *
 * Docs: https://docs.livepix.gg/api/
 * - POST https://oauth.livepix.gg/oauth2/token (client_credentials)
 * - POST https://api.livepix.gg/v2/payments { amount, currency, redirectUrl }
 */

import { isStubPaymentsAllowed } from "@/lib/demo";


const OAUTH_URL = "https://oauth.livepix.gg/oauth2/token";
const PAYMENTS_URL = "https://api.livepix.gg/v2/payments";
const DEFAULT_SCOPE = "payments:write payments:read account:read";

export type LivePixCheckoutInput = {
  amountCents: number;
  description: string;
  externalId: string;
  returnUrl?: string;
};

export type LivePixCheckoutResult = {
  ok: boolean;
  /** Hosted checkout URL (redirectUrl from LivePix or local stub). */
  checkoutUrl?: string;
  /** LivePix reference (or stub ref). */
  providerRef?: string;
  mode?: "live" | "stub";
  error?: string;
};

type TokenCache = { accessToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export function getLivePixEnv() {
  const clientId =
    process.env.LIVEPIX_CLIENT_ID_CONSULTAJA?.trim() ||
    process.env.LIVEPIX_CLIENT_ID?.trim() ||
    process.env.LIVEPIX_API_KEY?.trim() ||
    "";
  const clientSecret =
    process.env.LIVEPIX_CLIENT_SECRET_CONSULTAJA?.trim() ||
    process.env.LIVEPIX_CLIENT_SECRET?.trim() ||
    "";
  return {
    clientId,
    clientSecret,
    apiKey: "",
    webhookSecret: process.env.LIVEPIX_WEBHOOK_SECRET?.trim() || "",
  };
}

/** True when OAuth client id+secret are present (real API path). */
export function isLivePixConfigured(): boolean {
  const e = getLivePixEnv();
  return Boolean(e.clientId && e.clientSecret);
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getLivePixEnv();
  if (!clientId || !clientSecret) {
    throw new Error("LivePix OAuth credentials missing");
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: process.env.LIVEPIX_OAUTH_SCOPE?.trim() || DEFAULT_SCOPE,
  });

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LivePix OAuth failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

function stubCheckout(input: LivePixCheckoutInput): LivePixCheckoutResult {
  console.info("[livepix stub] createCheckout", input);
  const returnPath = input.returnUrl || "/client/dashboard";
  if (returnPath.startsWith("http")) {
    const url = new URL(returnPath);
    url.searchParams.set("pay", input.externalId);
    return {
      ok: true,
      checkoutUrl: url.toString(),
      providerRef: `stub_${input.externalId}_${Date.now()}`,
      mode: "stub",
    };
  }
  const sep = returnPath.includes("?") ? "&" : "?";
  return {
    ok: true,
    checkoutUrl: `${returnPath}${sep}pay=${encodeURIComponent(input.externalId)}`,
    providerRef: `stub_${input.externalId}_${Date.now()}`,
    mode: "stub",
  };
}

export async function createCheckout(
  input: LivePixCheckoutInput
): Promise<LivePixCheckoutResult> {
  if (!isLivePixConfigured()) {
    if (!isStubPaymentsAllowed()) {
      return {
        ok: false,
        error:
          "LivePix não configurado. Defina LIVEPIX_CLIENT_ID/SECRET (ou DEMO=1 em dev).",
      };
    }
    return stubCheckout(input);
  }

  try {
    const token = await getAccessToken();
    const redirectUrl = input.returnUrl?.startsWith("http")
      ? input.returnUrl
      : `${appBaseUrl()}${input.returnUrl || "/client/dashboard"}`;

    const res = await fetch(PAYMENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(getLivePixEnv().apiKey
          ? { "X-Api-Key": getLivePixEnv().apiKey }
          : {}),
      },
      body: JSON.stringify({
        amount: input.amountCents,
        currency: "BRL",
        redirectUrl,
        reference: input.externalId,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[livepix] create payment failed", res.status, text);
      return {
        ok: false,
        error: `LivePix pagamento falhou (${res.status}).`,
        mode: "live",
      };
    }

    const json = (await res.json()) as {
      data?: { reference?: string; redirectUrl?: string };
      reference?: string;
      redirectUrl?: string;
    };
    const data = json.data ?? json;
    const checkoutUrl = data.redirectUrl;
    const providerRef = data.reference || input.externalId;
    if (!checkoutUrl) {
      return {
        ok: false,
        error: "LivePix não retornou redirectUrl.",
        mode: "live",
      };
    }
    return {
      ok: true,
      checkoutUrl,
      providerRef,
      mode: "live",
    };
  } catch (err) {
    console.error("[livepix] createCheckout error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha LivePix",
      mode: "live",
    };
  }
}

/**
 * Pull a numeric amount from common LivePix webhook/API shapes.
 * Returns null when no amount field is present.
 */
export function extractRawAmount(body: Record<string, unknown>): number | null {
  const candidates: unknown[] = [body.amount];
  if (body.resource && typeof body.resource === "object") {
    candidates.push((body.resource as Record<string, unknown>).amount);
  }
  if (body.data && typeof body.data === "object") {
    const data = body.data as Record<string, unknown>;
    candidates.push(data.amount);
    if (data.payment && typeof data.payment === "object") {
      candidates.push((data.payment as Record<string, unknown>).amount);
    }
  }
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string" && c.trim() !== "") {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * Normalize LivePix amount to cents.
 * Create-payment uses integer cents; webhooks may send cents or major units (e.g. 50 or 50.00).
 */
export function normalizeAmountToCents(
  raw: number,
  expectedCents: number
): number {
  if (!Number.isFinite(raw)) return NaN;
  if (raw === expectedCents) return expectedCents;
  const asMajor = Math.round(raw * 100);
  if (asMajor === expectedCents) return expectedCents;
  // Integer → prefer cents (API contract); decimal → major units
  if (Number.isInteger(raw)) return raw;
  return asMajor;
}

export type AmountCheckResult =
  | { status: "missing"; amountCents: null }
  | { status: "match"; amountCents: number }
  | { status: "mismatch"; amountCents: number; expectedCents: number };

/** Compare webhook/API amount against expected cents. Missing amount is allowed (caller logs). */
export function checkPaidAmount(
  bodyOrRaw: Record<string, unknown> | number | null | undefined,
  expectedCents: number
): AmountCheckResult {
  let raw: number | null;
  if (bodyOrRaw == null) raw = null;
  else if (typeof bodyOrRaw === "number") raw = bodyOrRaw;
  else raw = extractRawAmount(bodyOrRaw);
  if (raw == null) return { status: "missing", amountCents: null };
  const amountCents = normalizeAmountToCents(raw, expectedCents);
  if (amountCents === expectedCents) {
    return { status: "match", amountCents };
  }
  return { status: "mismatch", amountCents, expectedCents };
}

export type VerifyPaymentResult = {
  paid: boolean;
  amountCents?: number | null;
  amountMismatch?: boolean;
  raw?: unknown;
};

export async function verifyPayment(
  providerRef: string,
  expectedAmountCents?: number
): Promise<VerifyPaymentResult> {
  if (!isLivePixConfigured()) {
    console.info("[livepix stub] verifyPayment", providerRef);
    return { paid: false };
  }
  try {
    const token = await getAccessToken();
    const url = new URL(PAYMENTS_URL);
    url.searchParams.set("reference", providerRef);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { paid: false };
    const json = (await res.json()) as { data?: unknown[] };
    const rows = Array.isArray(json.data) ? json.data : [];
    if (rows.length === 0) return { paid: false, raw: json };

    const first =
      rows[0] && typeof rows[0] === "object"
        ? (rows[0] as Record<string, unknown>)
        : {};
    const rawAmt = extractRawAmount(first);
    if (expectedAmountCents == null) {
      const amountCents =
        rawAmt == null
          ? null
          : Number.isInteger(rawAmt)
            ? rawAmt
            : Math.round(rawAmt * 100);
      return { paid: true, amountCents, raw: json };
    }
    const check = checkPaidAmount(
      rawAmt != null ? rawAmt : first,
      expectedAmountCents
    );
    if (check.status === "mismatch") {
      console.warn(
        "[livepix] verifyPayment amount mismatch",
        providerRef,
        check.amountCents,
        "expected",
        expectedAmountCents
      );
      return {
        paid: false,
        amountCents: check.amountCents,
        amountMismatch: true,
        raw: json,
      };
    }
    if (check.status === "missing") {
      console.warn(
        "[livepix] verifyPayment amount missing; treating as paid",
        providerRef
      );
    }
    return {
      paid: true,
      amountCents: check.amountCents,
      amountMismatch: false,
      raw: json,
    };
  } catch (err) {
    console.error("[livepix] verifyPayment", err);
    return { paid: false };
  }
}

/** Simula confirmação de webhook LivePix (demo local). */
export type StubConfirmInput = {
  requestId: string;
  kind?: "consultation" | "subscription";
  psychologistId?: string;
};
