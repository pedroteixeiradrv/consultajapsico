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

export type VerificationStatus = "pending" | "approved" | "rejected";

/**
 * Payout release state (no auto LivePix transfer):
 * - pending_client: session ended; waiting client confirm
 * - eligible: client confirmed → next admin batch (dias 10/28)
 * - needs_admin_review: no confirm and/or SAC opened → HOLD
 * - released: admin released into owed/batch
 * - denied: admin denied payout
 */
export type PayoutReleaseStatus =
  | "pending_client"
  | "eligible"
  | "needs_admin_review"
  | "released"
  | "denied";

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
  /** WhatsApp E.164 ou BR — obrigatório no cadastro */
  whatsapp: string | null;
  pix_key: string | null;
  subscription_status: SubscriptionStatus;
  /** ISO — mensalidade libera alertas de e-mail por 30 dias */
  subscription_expires_at: string | null;
  verification_status: VerificationStatus;
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
  /** Paid amount vs expected when LivePix amount mismatched (cents received). */
  payment_mismatch_cents: number | null;
  refund_requested: boolean;
  refunded_at: string | null;
  payout_credited: boolean;
  /** Client must confirm attendance before payout eligibility */
  attendance_confirmed_by_client: boolean;
  attendance_confirmed_at: string | null;
  /** Client → psych (optional 1–5) */
  client_rating_of_psych: number | null;
  client_rating_comment: string | null;
  /** Psych → client (optional 1–5) after session ends */
  psych_rating_of_client: number | null;
  psych_rating_comment: string | null;
  payout_release_status: PayoutReleaseStatus;
  /** SAC opened for this consultation at/after end → HOLD */
  sac_linked_at: string | null;
  payout_withheld: boolean;
  payout_withheld_reason: string | null;
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
  /** Keyword for free 30-day subscription; null/empty = disabled */
  subscription_coupon_code: string | null;
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
  payout_batch_id: string | null;
  created_at: string;
  paid_at: string | null;
};

/** Lotes manuais admin (dias 10 e 28) — sem transferência automática LivePix */
export type PayoutBatch = {
  id: string;
  label: string;
  status: "open" | "paid";
  total_cents: number;
  notes: string | null;
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
