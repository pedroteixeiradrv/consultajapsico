/** Tipos de domínio ConsultaJáPsico (skeleton) */

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "cancelled";

export type ConsultationStatus =
  | "pending"
  | "accepted"
  | "in_call"
  | "completed"
  | "cancelled";

/** MVP: somente pacientes identificados */
export type ConsultationKind = "identified";

export type SacStatus = "open" | "in_progress" | "resolved" | "closed";

/** Preços default (espelham platform_settings) — apenas identificados */
export const DEFAULT_PRICES = {
  monthlyFeeCents: 9900,
  priceIdCents: 5000, // R$50 identificado
  psychCutIdCents: 4000, // R$40
  sessionMinutes: 30,
} as const;
