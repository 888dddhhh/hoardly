/**
 * Hoardly — Supabase client stub
 *
 * HOW TO ACTIVATE:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Run supabase/schema.sql in the SQL Editor
 * 3. Copy your project URL and anon key to .env:
 *    VITE_SUPABASE_URL=https://xxxx.supabase.co
 *    VITE_SUPABASE_ANON_KEY=eyJhbGci...
 * 4. npm install @supabase/supabase-js
 * 5. Remove the stub below and uncomment the real client
 */

// ── Real client (uncomment after setup) ────────────────────────────────────
// import { createClient } from "@supabase/supabase-js";
//
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
//
// export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Stub (delete this block when real client is active) ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = null as unknown as any;

export const SUPABASE_READY =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

// ── Data layer shim ──────────────────────────────────────────────────────────
// Replace the hoardly-capture localStorage functions with these once Supabase is live.

export async function fetchCards(userId: string) {
  if (!SUPABASE_READY) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertCard(card: Record<string, unknown>) {
  if (!SUPABASE_READY) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("cards").upsert(card).select().single();
  if (error) throw error;
  return data;
}

export async function softDeleteCard(cardId: string) {
  if (!SUPABASE_READY) throw new Error("Supabase not configured");
  const { error } = await supabase
    .from("cards")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", cardId);
  if (error) throw error;
}

export async function hybridSearch(queryText: string, queryEmbedding: number[], limit = 20) {
  if (!SUPABASE_READY) throw new Error("Supabase not configured");
  const { data, error } = await supabase.rpc("hybrid_search", {
    query_text: queryText,
    query_embedding: queryEmbedding,
    match_count: limit,
  });
  if (error) throw error;
  return data;
}
