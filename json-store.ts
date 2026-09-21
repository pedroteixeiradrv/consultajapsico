/**
 * File-based JSON store for zero-config local demo.
 * Replace with Supabase when NEXT_PUBLIC_SUPABASE_URL is set (see lib/store/index.ts).
 */
import fs from "fs";
import path from "path";
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

export type Database = {
  admins: Admin[];
  psychologists: Psychologist[];
  clients: Client[];
  consultation_requests: ConsultationRequest[];
  credits_ledger: CreditsLedgerEntry[];
  sac_tickets: SacTicket[];
  platform_settings: PlatformSettings;
  payouts: Payout[];
  payout_batches: PayoutBatch[];
  email_log: EmailLogEntry[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function emptyDb(): Database {
  const now = new Date().toISOString();
  return {
    admins: [],
    psychologists: [],
    clients: [],
    consultation_requests: [],
    credits_ledger: [],
    sac_tickets: [],
    platform_settings: {
      id: "default",
      monthly_fee_cents: DEFAULT_PRICES.monthlyFeeCents,
      price_id_cents: DEFAULT_PRICES.priceIdCents,
      psych_cut_id_cents: DEFAULT_PRICES.psychCutIdCents,
      session_duration_minutes: DEFAULT_PRICES.sessionMinutes,
      subscription_coupon_code: null,
      created_at: now,
      updated_at: now,
    },
    payouts: [],
    payout_batches: [],
    email_log: [],
  };
}

let lock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => T): Promise<T> {
  const run = lock.then(() => fn());
  lock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}


function normalizeDb(db: Database): Database {
  if (!db.payout_batches) db.payout_batches = [];
  if (db.platform_settings && db.platform_settings.subscription_coupon_code === undefined) {
    db.platform_settings.subscription_coupon_code = null;
  }
  for (const p of db.psychologists ?? []) {
    if (p.whatsapp === undefined) (p as { whatsapp: string | null }).whatsapp = null;
    if (p.subscription_expires_at === undefined)
      (p as { subscription_expires_at: string | null }).subscription_expires_at = null;
    if (p.verification_status === undefined)
      (p as { verification_status: string }).verification_status = "approved";
  }
  for (const r of db.consultation_requests ?? []) {
    const any = r as Record<string, unknown>;
    if (any.attendance_confirmed_by_client === undefined)
      any.attendance_confirmed_by_client = false;
    if (any.attendance_confirmed_at === undefined) any.attendance_confirmed_at = null;
    if (any.client_rating_of_psych === undefined) any.client_rating_of_psych = null;
    if (any.client_rating_comment === undefined) any.client_rating_comment = null;
    if (any.psych_rating_of_client === undefined) any.psych_rating_of_client = null;
    if (any.psych_rating_comment === undefined) any.psych_rating_comment = null;
    if (any.payout_release_status === undefined)
      any.payout_release_status = r.status === "completed" ? "pending_client" : "pending_client";
    if (any.sac_linked_at === undefined) any.sac_linked_at = null;
    if (any.payout_withheld === undefined) any.payout_withheld = false;
    if (any.payout_withheld_reason === undefined) any.payout_withheld_reason = null;
    if (any.payment_mismatch_cents === undefined) any.payment_mismatch_cents = null;
  }
  for (const p of db.payouts ?? []) {
    if ((p as { payout_batch_id?: string | null }).payout_batch_id === undefined)
      (p as { payout_batch_id: string | null }).payout_batch_id = null;
  }
  return db;
}

function readDb(): Database {
  ensureDir();
  if (!fs.existsSync(STORE_PATH)) {
    const db = emptyDb();
    fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2), "utf8");
    return normalizeDb(db);
  }
  const raw = fs.readFileSync(STORE_PATH, "utf8");
  try {
    return normalizeDb({ ...emptyDb(), ...JSON.parse(raw) } as Database);
  } catch {
    const db = emptyDb();
    fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2), "utf8");
    return db;
  }
}

function writeDb(db: Database) {
  ensureDir();
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, STORE_PATH);
}

export async function mutateStore<T>(
  mutator: (db: Database) => T
): Promise<T> {
  return withLock(() => {
    const db = readDb();
    const result = mutator(db);
    writeDb(db);
    return result;
  });
}

export async function readStore(): Promise<Database> {
  return withLock(() => readDb());
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
