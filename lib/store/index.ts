/**
 * Store facade — Supabase when URL + service role are set; else local JSON.
 */
import { isSupabaseServiceConfigured } from "@/lib/supabase";
import type { Database } from "./json-store";

import * as jsonStore from "./json-store";
import * as supabaseStore from "./supabase-store";

function backend() {
  return isSupabaseServiceConfigured() ? supabaseStore : jsonStore;
}

export async function readStore(): Promise<Database> {
  return backend().readStore();
}

export async function mutateStore<T>(
  mutator: (db: Database) => T
): Promise<T> {
  return backend().mutateStore(mutator);
}

export function newId(): string {
  return backend().newId();
}

export function nowIso(): string {
  return backend().nowIso();
}

export type { Database };

/** True only when the live store backend is Supabase (service role). */
export function usingSupabase(): boolean {
  return isSupabaseServiceConfigured();
}

export function storeBackendLabel(): string {
  return usingSupabase()
    ? "supabase (service role)"
    : "local JSON (data/store.json)";
}
