import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ── Types ──────────────────────────────────────────────────────────────────

export interface BlinProfile {
  wallet_address:   string;
  display_name:     string;
  email:            string;
  autosave_enabled: boolean;
  save_percent:     number;
  lock_duration:    number;
  onboarding_done:  boolean;
  flow_score:       number;
  joined_at:        string;
  updated_at:       string;
}

// ── Profile helpers ────────────────────────────────────────────────────────

/** Fetch a profile by wallet address. Returns null if not found. */
export async function fetchProfile(walletAddress: string): Promise<BlinProfile | null> {
  const { data, error } = await supabase
    .from("blin_profiles")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("[blin] fetchProfile error:", error.message);
    return null;
  }
  return data as BlinProfile | null;
}

/** Upsert (create or update) a profile. Safe to call on every save. */
export async function upsertProfile(
  walletAddress: string,
  data: Partial<Omit<BlinProfile, "wallet_address" | "joined_at" | "updated_at" | "flow_score">>
): Promise<BlinProfile | null> {
  const { data: result, error } = await supabase
    .from("blin_profiles")
    .upsert(
      { wallet_address: walletAddress.toLowerCase(), ...data },
      { onConflict: "wallet_address" }
    )
    .select()
    .single();

  if (error) {
    console.error("[blin] upsertProfile error:", error.message);
    return null;
  }
  return result as BlinProfile;
}
