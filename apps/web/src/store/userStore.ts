import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  displayName: string;        // e.g. "Ada Obi" — user-entered
  email: string;              // user-entered
  hasCompletedOnboarding: boolean;
  autoSaveEnabled: boolean;
  savePercent: number;        // 1-50
  lockDuration: number;       // months: 1 | 3 | 6 | 12
}

interface UserStore extends UserProfile {
  setProfile: (data: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

const DEFAULTS: UserProfile = {
  displayName: "",
  email: "",
  hasCompletedOnboarding: false,
  autoSaveEnabled: false,
  savePercent: 10,
  lockDuration: 3,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setProfile: (data) => set((state) => ({ ...state, ...data })),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: "blin-user-profile",   // localStorage key
      version: 1,
    }
  )
);
