/** Tipos de domínio ConsultaJáPsico */

export type Role = "admin" | "psych" | "client";

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

export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

/** Preços default (espelham platform_settings) — apenas identificados */
export const DEFAULT_PRICES = {
  monthlyFeeCents: 9900,
  priceIdCents: 5000, // R$50 identificado
  psychCutIdCents: 4000, // R$40
  sessionMinutes: 30,
} as const;

export type Admin = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export type Psychologist = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  crp: string | null;
  pix_key: string | null;
  subscription_status: SubscriptionStatus;
  online: boolean;
  payout_balance_cents: number;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  credits_cents: number;
  created_at: string;
  updated_at: string;
};

export type ConsultationRequest = {
  id: string;
  status: ConsultationStatus;
  client_id: string;
  psychologist_id: string | null;
  price_cents: number;
  psych_cut_cents: number;
  paid_at: string | null;
  accepted_at: string | null;
  call_started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  refund_requested: boolean;
  refunded_at: string | null;
  payout_credited: boolean;
  created_at: string;
  updated_at: string;
};

export type CreditsLedgerEntry = {
  id: string;
  client_id: string;
  amount_cents: number;
  reason: string;
  consultation_request_id: string | null;
  created_at: string;
};

export type SacTicket = {
  id: string;
  requester_email: string | null;
  subject: string;
  body: string;
  consultation_request_id: string | null;
  proof_note: string | null;
  status: SacStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformSettings = {
  id: string;
  monthly_fee_cents: number;
  price_id_cents: number;
  psych_cut_id_cents: number;
  session_duration_minutes: number;
  created_at: string;
  updated_at: string;
};

export type Payout = {
  id: string;
  psychologist_id: string;
  consultation_request_id: string | null;
  amount_cents: number;
  pix_key: string;
  status: PayoutStatus;
  provider_ref: string | null;
  created_at: string;
  paid_at: string | null;
};

export type EmailLogEntry = {
  id: string;
  to: string;
  subject: string;
  reason: string;
  created_at: string;
};

export type SessionPayload = {
  role: Role;
  sub: string;
  email: string;
};
