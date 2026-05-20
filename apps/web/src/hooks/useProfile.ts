"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { useUserStore } from "@/store/userStore";
import { fetchProfile, upsertProfile } from "@/lib/supabase";

/**
 * Syncs the local Zustand userStore ↔ Supabase blin_profiles.
 *
 * - On wallet connect: fetches the DB row and hydrates the local store
 *   (so returning users get their name/settings back automatically).
 * - On disconnect: does nothing (store keeps last values for UX continuity).
 *
 * Call upsertProfile() directly from onboarding / profile page when the user
 * explicitly saves — this hook only handles the initial load.
 */
export function useProfile() {
  const { address, isConnected } = useAuth();
  const { setProfile, displayName, email, autoSaveEnabled, savePercent, lockDuration, hasCompletedOnboarding } = useUserStore();
  const loadedRef = useRef<string | null>(null); // track which address we've already loaded

  // ── Load profile from DB when wallet connects ──────────────────────────
  useEffect(() => {
    if (!isConnected || !address) return;
    if (loadedRef.current === address) return; // already loaded for this address
    loadedRef.current = address;

    fetchProfile(address).then((profile) => {
      if (!profile) return; // first-time user — nothing to load yet
      setProfile({
        displayName:          profile.display_name,
        email:                profile.email,
        autoSaveEnabled:      profile.autosave_enabled,
        savePercent:          profile.save_percent,
        lockDuration:         profile.lock_duration,
        hasCompletedOnboarding: profile.onboarding_done,
      });
    });
  }, [isConnected, address, setProfile]);

  // ── Expose a save helper (used by onboarding + profile page) ──────────
  const saveToDb = async () => {
    if (!address) return;
    await upsertProfile(address, {
      display_name:     displayName,
      email:            email,
      autosave_enabled: autoSaveEnabled,
      save_percent:     savePercent,
      lock_duration:    lockDuration,
      onboarding_done:  hasCompletedOnboarding,
    });
  };

  return { saveToDb };
}
