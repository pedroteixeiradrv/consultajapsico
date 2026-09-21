/**
 * Supabase clients — browser (anon) and server (service role).
 * Store uses service role only when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

/** True when URL + service role are present (server store backend). */
export function isSupabaseServiceConfigured(): boolean {
  const e = getSupabaseEnv();
  return Boolean(e.url && e.serviceRole);
}

/** True when URL + anon key are present (browser client). */
export function isSupabaseConfigured(): boolean {
  const e = getSupabaseEnv();
  return Boolean(e.url && e.anonKey);
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase não configurado. Use o store local (data/store.json) ou preencha .env.local."
    );
  }
  return createClient(url, anonKey);
}

export function createSupabaseServiceClient(): SupabaseClient {
  const { url, serviceRole } = getSupabaseEnv();
  if (!url || !serviceRole) {
    throw new Error(
      "Supabase service role não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
