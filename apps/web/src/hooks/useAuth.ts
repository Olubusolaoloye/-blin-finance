import { useAccount, useChainId } from "wagmi";
import { usePrivy }               from "@privy-io/react-auth";
import { shortenAddress }         from "@/lib/format";
import { useUserStore }           from "@/store/userStore";
import type { Address }           from "viem";

/**
 * Unified auth hook — merges Privy's session state with wagmi's account.
 *
 * After Google/Apple login:
 *   • `authenticated` is true immediately (Privy session)
 *   • `isConnected`   becomes true after SmartAccountActivator sets the wallet
 *   • `address`       is the smart-wallet (or embedded EOA) address
 *   • `googleEmail`   / `appleEmail` are populated from the OAuth profile
 *
 * AuthGuard uses both `ready` + `authenticated` so the app never flashes
 * the login screen while Privy is re-hydrating a saved session.
 */
export function useAuth() {
  const { ready, authenticated, logout, user } = usePrivy();
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { displayName, email: storedEmail } = useUserStore();

  // ── Social profile fields from Privy OAuth ───────────────────────────────
  const googleAccount = user?.linkedAccounts.find((a: { type: string }) => a.type === "google_oauth");
  const appleAccount  = user?.linkedAccounts.find((a: { type: string }) => a.type === "apple_oauth");

  const socialName =
    (googleAccount as { name?: string } | undefined)?.name ??
    (appleAccount  as { name?: string } | undefined)?.name ??
    null;

  const socialEmail =
    (googleAccount as { email?: string } | undefined)?.email ??
    (appleAccount  as { email?: string } | undefined)?.email ??
    storedEmail ??
    null;

  const socialAvatar =
    (googleAccount as { profilePictureUrl?: string } | undefined)?.profilePictureUrl ??
    null;

  // ── Derived display fields ────────────────────────────────────────────────
  const resolvedName = displayName || socialName;

  const initials = resolvedName
    ? resolvedName.trim().split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase()
    : address
    ? address.slice(2, 4).toUpperCase()
    : "??";

  const firstName = resolvedName
    ? resolvedName.trim().split(" ")[0]
    : null;

  return {
    // Auth state
    ready,                          // Privy session hydrated (prevents login flash)
    authenticated,                  // Social login completed OR external wallet connected
    isConnected,                    // wagmi connector active (address available)
    isConnecting: isConnecting || isReconnecting,

    // Wallet
    address:      address as Address | undefined,
    shortAddress: address ? shortenAddress(address) : null,
    chainId,

    // Profile (prefers local store > OAuth profile)
    displayName:  resolvedName,
    firstName,
    email:        socialEmail,
    avatar:       socialAvatar,
    initials,

    // Actions
    disconnect:   logout,           // Privy logout clears session + embedded wallet
  };
}
