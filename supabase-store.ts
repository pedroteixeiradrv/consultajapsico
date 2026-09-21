/**
 * Supabase-backed store — same mutateStore/readStore API as json-store.
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  Admin,
  Client,
  ConsultationRequest,
  CreditsLedgerEntry,
  DEFAULT_PRICES,
  EmailLogEntry,
  Payout,
  PayoutBatch,
  PlatformSettings,
  Psychologist,
  SacTicket,
} from "@/lib/types";
import type { Database } from "./json-store";
import type { SupabaseClient } from "@supabase/supabase-js";

type EmailLogRow = {
  id: string;
  to_email: string;
  subject: string;
  reason: string;
  created_at: string;
};

function emptySettings(): PlatformSettings {
  const now = new Date().toISOString();
  return {
    id: "default",
    monthly_fee_cents: DEFAULT_PRICES.monthlyFeeCents,
    price_id_cents: DEFAULT_PRICES.priceIdCents,
    psych_cut_id_cents: DEFAULT_PRICES.psychCutIdCents,
    session_duration_minutes: DEFAULT_PRICES.sessionMinutes,
    subscription_coupon_code: null,
    created_at: now,
    updated_at: now,
  };
}

function emailToRow(e: EmailLogEntry): EmailLogRow {
  return {
    id: e.id,
    to_email: e.to,
    subject: e.subject,
    reason: e.reason,
    created_at: e.created_at,
  };
}

function emailFromRow(r: EmailLogRow): EmailLogEntry {
  return {
    id: r.id,
    to: r.to_email,
    subject: r.subject,
    reason: r.reason,
    created_at: r.created_at,
  };
}

function throwOnError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`[supabase-store] ${context}: ${error.message}`);
  }
}

async function selectAll<T>(
  client: SupabaseClient,
  table: string
): Promise<T[]> {
  const { data, error } = await client.from(table).select("*");
  throwOnError(error, `select ${table}`);
  return (data ?? []) as T[];
}

async function upsertRows(
  client: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[]
) {
  if (rows.length === 0) return;
  const { error } = await client.from(table).upsert(rows);
  throwOnError(error, `upsert ${table}`);
}

async function deleteMissing(
  client: SupabaseClient,
  table: string,
  beforeIds: string[],
  afterIds: Set<string>
) {
  const toDelete = beforeIds.filter((id) => !afterIds.has(id));
  if (toDelete.length === 0) return;
  const { error } = await client.from(table).delete().in("id", toDelete);
  throwOnError(error, `delete ${table}`);
}

async function loadDb(client: SupabaseClient): Promise<Database> {
  const [
    admins,
    psychologists,
    clients,
    consultation_requests,
    credits_ledger,
    sac_tickets,
    settingsRows,
    payouts,
    payout_batches,
    emailRows,
  ] = await Promise.all([
    selectAll<Admin>(client, "admins"),
    selectAll<Psychologist>(client, "psychologists"),
    selectAll<Client>(client, "clients"),
    selectAll<ConsultationRequest>(client, "consultation_requests"),
    selectAll<CreditsLedgerEntry>(client, "credits_ledger"),
    selectAll<SacTicket>(client, "sac_tickets"),
    selectAll<PlatformSettings>(client, "platform_settings"),
    selectAll<Payout>(client, "payouts"),
    selectAll<PayoutBatch>(client, "payout_batches"),
    selectAll<EmailLogRow>(client, "email_log"),
  ]);

  return {
    admins,
    psychologists,
    clients,
    consultation_requests,
    credits_ledger,
    sac_tickets,
    platform_settings: settingsRows[0] ?? emptySettings(),
    payouts,
    payout_batches: payout_batches ?? [],
    email_log: emailRows.map(emailFromRow),
  };
}

async function persistDb(client: SupabaseClient, before: Database, db: Database) {
  // Upsert parents → children
  await upsertRows(client, "admins", db.admins as unknown as Record<string, unknown>[]);
  await upsertRows(
    client,
    "psychologists",
    db.psychologists as unknown as Record<string, unknown>[]
  );
  await upsertRows(client, "clients", db.clients as unknown as Record<string, unknown>[]);
  await upsertRows(
    client,
    "consultation_requests",
    db.consultation_requests as unknown as Record<string, unknown>[]
  );
  await upsertRows(
    client,
    "credits_ledger",
    db.credits_ledger as unknown as Record<string, unknown>[]
  );
  await upsertRows(
    client,
    "sac_tickets",
    db.sac_tickets as unknown as Record<string, unknown>[]
  );
  await upsertRows(client, "payouts", db.payouts as unknown as Record<string, unknown>[]);
  await upsertRows(
    client,
    "payout_batches",
    (db.payout_batches ?? []) as unknown as Record<string, unknown>[]
  );
  await upsertRows(
    client,
    "email_log",
    db.email_log.map(emailToRow) as unknown as Record<string, unknown>[]
  );

  const { error: settingsErr } = await client
    .from("platform_settings")
    .upsert(db.platform_settings);
  throwOnError(settingsErr, "upsert platform_settings");

  // Delete children → parents (ids that disappeared)
  await deleteMissing(
    client,
    "email_log",
    before.email_log.map((r) => r.id),
    new Set(db.email_log.map((r) => r.id))
  );
  await deleteMissing(
    client,
    "payout_batches",
    (before.payout_batches ?? []).map((r) => r.id),
    new Set((db.payout_batches ?? []).map((r) => r.id))
  );
  await deleteMissing(
    client,
    "payouts",
    before.payouts.map((r) => r.id),
    new Set(db.payouts.map((r) => r.id))
  );
  await deleteMissing(
    client,
    "sac_tickets",
    before.sac_tickets.map((r) => r.id),
    new Set(db.sac_tickets.map((r) => r.id))
  );
  await deleteMissing(
    client,
    "credits_ledger",
    before.credits_ledger.map((r) => r.id),
    new Set(db.credits_ledger.map((r) => r.id))
  );
  await deleteMissing(
    client,
    "consultation_requests",
    before.consultation_requests.map((r) => r.id),
    new Set(db.consultation_requests.map((r) => r.id))
  );
  await deleteMissing(
    client,
    "clients",
    before.clients.map((r) => r.id),
    new Set(db.clients.map((r) => r.id))
  );
  await deleteMissing(
    client,
    "psychologists",
    before.psychologists.map((r) => r.id),
    new Set(db.psychologists.map((r) => r.id))
  );
  await deleteMissing(
    client,
    "admins",
    before.admins.map((r) => r.id),
    new Set(db.admins.map((r) => r.id))
  );
}

let lock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(() => fn());
  lock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function readStore(): Promise<Database> {
  return withLock(async () => {
    const client = createSupabaseServiceClient();
    return loadDb(client);
  });
}

export async function mutateStore<T>(
  mutator: (db: Database) => T
): Promise<T> {
  return withLock(async () => {
    const client = createSupabaseServiceClient();
    const before = await loadDb(client);
    const db: Database = {
      admins: [...before.admins],
      psychologists: [...before.psychologists],
      clients: [...before.clients],
      consultation_requests: [...before.consultation_requests],
      credits_ledger: [...before.credits_ledger],
      sac_tickets: [...before.sac_tickets],
      platform_settings: { ...before.platform_settings },
      payouts: [...before.payouts],
      payout_batches: [...(before.payout_batches ?? [])],
      email_log: [...before.email_log],
    };
    const result = mutator(db);
    await persistDb(client, before, db);
    return result;
  });
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
