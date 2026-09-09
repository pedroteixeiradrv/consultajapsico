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
      created_at: now,
      updated_at: now,
    },
    payouts: [],
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

function readDb(): Database {
  ensureDir();
  if (!fs.existsSync(STORE_PATH)) {
    const db = emptyDb();
    fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2), "utf8");
    return db;
  }
  const raw = fs.readFileSync(STORE_PATH, "utf8");
  try {
    return { ...emptyDb(), ...JSON.parse(raw) } as Database;
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
