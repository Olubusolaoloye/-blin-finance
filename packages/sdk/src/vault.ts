import { ResultAsync, errAsync } from "neverthrow";
import { z } from "zod";
import { BlinErrors, CONTRACT_ADDRESSES, TESTNET_CONTRACT_ADDRESSES, type BlinError } from "@blin/shared";

function getAddresses(chainId: number) {
  if (chainId in TESTNET_CONTRACT_ADDRESSES)
    return TESTNET_CONTRACT_ADDRESSES[chainId as keyof typeof TESTNET_CONTRACT_ADDRESSES];
  if (chainId in CONTRACT_ADDRESSES)
    return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  // Fallback — never reached if wagmi config is correct
  return CONTRACT_ADDRESSES[1];
}
import type { Address } from "viem";
import type { BlinClient } from "./client";
import { formatUnits } from "viem";
import {
  AUTO_SAVE_VAULT_ABI,
  VAULT_FACTORY_ABI,
  ERC20_ABI,
  MOCK_ERC20_ABI,
} from "./abis";
import type {
  VaultLock,
  CreateLockRequest,
  TopUpRequest,
  WithdrawRequest,
  BreakLockRequest,
  ContractInteraction,
} from "./types";

const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/) as z.ZodType<Address>;

// ─── Raw contract Lock struct shape ──────────────────────────────────────────
//
// Matches AutoSaveVault.Lock:
//   { id, owner, principal, lockedAt, lockedUntil, blinReward, name, settled }
//
interface RawLock {
  id:          bigint;
  owner:       `0x${string}`;
  principal:   bigint;
  lockedAt:    bigint;
  lockedUntil: bigint;
  blinReward:  bigint;
  name:        `0x${string}`;
  settled:     boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toVaultLock(raw: RawLock): VaultLock {
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const secsRemaining = raw.lockedUntil > nowSec ? raw.lockedUntil - nowSec : 0n;
  return {
    id:            raw.id,
    owner:         raw.owner as Address,
    principal:     raw.principal,
    lockedAt:      raw.lockedAt,
    lockedUntil:   raw.lockedUntil,
    blinReward:    raw.blinReward,
    name:          safeDecodeBytes32(raw.name),
    settled:       raw.settled,
    daysRemaining: Number(secsRemaining / 86400n),
    maturityDate:  new Date(Number(raw.lockedUntil) * 1000),
    currentValue:  raw.principal,
  };
}

// Bytes32 string helpers — not in viem v2 public API, so we implement directly.

function encodeBytes32String(str: string): `0x${string}` {
  const bytes = new TextEncoder().encode(str.slice(0, 31));
  const padded = new Uint8Array(32);
  padded.set(bytes);
  return ("0x" + Array.from(padded).map((b) => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

function safeDecodeBytes32(value: `0x${string}`): string {
  try {
    const bytes = new Uint8Array(
      (value.slice(2).match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)),
    );
    // Find first trailing zero run and trim
    let end = bytes.length;
    while (end > 0 && bytes[end - 1] === 0) end--;
    return new TextDecoder().decode(bytes.slice(0, end));
  } catch {
    return "";
  }
}

function toBlinError(err: unknown): BlinError {
  return BlinErrors.rpc(
    err instanceof Error ? err.message : "Contract call failed",
    undefined,
    err,
  );
}

// ─── Public: vault address ────────────────────────────────────────────────────

export function getUserVault(
  client: BlinClient,
  user: Address,
): ResultAsync<Address | null, BlinError> {
  const parsed = addressSchema.safeParse(user);
  if (!parsed.success) {
    return errAsync(BlinErrors.validation("user", user));
  }

  const factoryAddress = getAddresses(client.chainId).vaultFactory;
  if (factoryAddress === "0x0000000000000000000000000000000000000000") {
    // Not deployed on this chain yet
    return ResultAsync.fromSafePromise(Promise.resolve(null as Address | null));
  }

  return ResultAsync.fromPromise(
    (async () => {
      // ⚠️  getVault() returns _predictAddress(user) even before deployment,
      //     using address(0) as strategy placeholder → wrong non-zero address.
      //     Always check hasVault() first; only call getVault() when true.
      const deployed = await client.publicClient.readContract({
        address: factoryAddress,
        abi: VAULT_FACTORY_ABI,
        functionName: "hasVault",
        args: [parsed.data],
      }) as boolean;

      if (!deployed) return null as Address | null;

      return client.publicClient.readContract({
        address: factoryAddress,
        abi: VAULT_FACTORY_ABI,
        functionName: "getVault",
        args: [parsed.data],
      }).then((addr) =>
        addr === "0x0000000000000000000000000000000000000000" ? null : (addr as Address),
      );
    })(),
    toBlinError,
  );
}

// ─── Public: list locks ───────────────────────────────────────────────────────

export function listLocks(
  client: BlinClient,
  vaultAddress: Address,
  owner: Address,
): ResultAsync<VaultLock[], BlinError> {
  const parsedVault = addressSchema.safeParse(vaultAddress);
  const parsedOwner = addressSchema.safeParse(owner);

  if (!parsedVault.success) {
    return errAsync(BlinErrors.validation("vaultAddress", vaultAddress));
  }
  if (!parsedOwner.success) {
    return errAsync(BlinErrors.validation("owner", owner));
  }

  return ResultAsync.fromPromise(
    client.publicClient
      .readContract({
        address: parsedVault.data,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "getUserLocks",
        args: [parsedOwner.data],
      })
      .then((locks) =>
        (locks as RawLock[]).map((raw) => toVaultLock(raw)),
      ),
    toBlinError,
  );
}

// ─── Internal: ensure ERC-20 allowance ───────────────────────────────────────

async function ensureAllowance(
  client: BlinClient,
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
  owner: Address,
): Promise<void> {
  if (!client.walletClient) throw BlinErrors.unauthorizedCaller("anonymous", "connected wallet");

  const allowance = await client.publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  });

  if ((allowance as bigint) >= amount) return;

  const { request } = await client.publicClient.simulateContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, amount],
    account: owner,
  });

  const approveHash = await client.walletClient.writeContract(request);

  // Wait for the approval to be mined before the caller proceeds to simulate/write
  // the vault operation — otherwise the allowance check will still fail on-chain.
  await client.publicClient.waitForTransactionReceipt({ hash: approveHash });
}

// ─── Public: createLock ───────────────────────────────────────────────────────

export function createLock(
  client: BlinClient,
  req: CreateLockRequest,
): ContractInteraction<CreateLockRequest> {
  const MIN_DURATION = BigInt(7 * 24 * 60 * 60);
  const MAX_DURATION = BigInt(3 * 365 * 24 * 60 * 60);

  return {
    request: req,

    simulate: async () => {
      if (req.amount === 0n) throw BlinErrors.zeroAmount();
      if (req.lockDurationSeconds < MIN_DURATION || req.lockDurationSeconds > MAX_DURATION) {
        throw BlinErrors.invalidLockDuration(
          req.lockDurationSeconds,
          MIN_DURATION,
          MAX_DURATION,
        );
      }

      const nameBytes = encodeBytes32String(req.name.slice(0, 31));

      const { result } = await client.publicClient.simulateContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "createLock",
        args: [req.amount, req.lockDurationSeconds, nameBytes],
        account: client.walletClient?.account?.address,
      });

      return result as bigint;
    },

    write: async () => {
      if (!client.walletClient?.account) {
        throw BlinErrors.unauthorizedCaller("anonymous", "connected wallet");
      }
      const caller = client.walletClient.account.address as Address;

      // Read the vault's USDC token address
      const assetAddress = await client.publicClient.readContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "usdc",
      }) as Address;

      // ── Pre-flight balance check ──────────────────────────────────────────
      // Catches ERC20InsufficientBalance (0xe450d38c) BEFORE sending the tx,
      // giving the user a clear "you need X more tokens" message instead of
      // a raw hex revert from simulateContract.
      const balance = await client.publicClient.readContract({
        address: assetAddress,
        abi:     ERC20_ABI,
        functionName: "balanceOf",
        args:    [caller],
      }) as bigint;

      if (balance < req.amount) {
        const decimals = await client.publicClient.readContract({
          address: assetAddress,
          abi:     ERC20_ABI,
          functionName: "decimals",
        }) as number;
        const have = formatUnits(balance, decimals);
        const need = formatUnits(req.amount, decimals);
        throw new Error(
          `Insufficient token balance — you have ${have} but need ${need}. ` +
          `Use the "Get Test Tokens" button to claim free testnet tokens.`,
        );
      }

      await ensureAllowance(client, assetAddress, req.vaultAddress, req.amount, caller);

      const nameBytes = encodeBytes32String(req.name.slice(0, 31));

      const { request } = await client.publicClient.simulateContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "createLock",
        args: [req.amount, req.lockDurationSeconds, nameBytes],
        account: caller,
      });

      return client.walletClient.writeContract(request);
    },
  };
}

// ─── Public: topUp ────────────────────────────────────────────────────────────

export function topUp(
  client: BlinClient,
  req: TopUpRequest,
): ContractInteraction<TopUpRequest> {
  return {
    request: req,

    simulate: async () => {
      if (req.amount === 0n) throw BlinErrors.zeroAmount();

      await client.publicClient.simulateContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "topUp",
        args: [req.lockId, req.amount],
        account: client.walletClient?.account?.address,
      });

      return 0n;
    },

    write: async () => {
      if (!client.walletClient?.account) {
        throw BlinErrors.unauthorizedCaller("anonymous", "connected wallet");
      }
      const caller = client.walletClient.account.address as Address;

      const assetAddress = await client.publicClient.readContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "usdc",
      }) as Address;

      // Pre-flight balance check — same pattern as createLock
      const balance = await client.publicClient.readContract({
        address: assetAddress,
        abi:     ERC20_ABI,
        functionName: "balanceOf",
        args:    [caller],
      }) as bigint;

      if (balance < req.amount) {
        const decimals = await client.publicClient.readContract({
          address: assetAddress,
          abi:     ERC20_ABI,
          functionName: "decimals",
        }) as number;
        throw new Error(
          `Insufficient token balance — you have ${formatUnits(balance, decimals)} ` +
          `but need ${formatUnits(req.amount, decimals)}. ` +
          `Use the "Get Test Tokens" button to claim free testnet tokens.`,
        );
      }

      await ensureAllowance(client, assetAddress, req.vaultAddress, req.amount, caller);

      const { request } = await client.publicClient.simulateContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "topUp",
        args: [req.lockId, req.amount],
        account: caller,
      });

      return client.walletClient.writeContract(request);
    },
  };
}

// ─── Public: withdraw ─────────────────────────────────────────────────────────

export function withdraw(
  client: BlinClient,
  req: WithdrawRequest,
): ContractInteraction<WithdrawRequest> {
  return {
    request: req,

    simulate: async () => {
      await client.publicClient.simulateContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "withdraw",
        args: [req.lockId],
        account: client.walletClient?.account?.address,
      });
      return 0n;
    },

    write: async () => {
      if (!client.walletClient?.account) {
        throw BlinErrors.unauthorizedCaller("anonymous", "connected wallet");
      }

      const { request } = await client.publicClient.simulateContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "withdraw",
        args: [req.lockId],
        account: client.walletClient.account.address,
      });

      return client.walletClient.writeContract(request);
    },
  };
}

// ─── Public: renameLock ───────────────────────────────────────────────────────

interface RenameLockRequest {
  vaultAddress: Address;
  lockId:       bigint;
  name:         string;
}

export function renameLock(
  client: BlinClient,
  req: RenameLockRequest,
): ContractInteraction<RenameLockRequest> {
  return {
    request: req,

    simulate: async () => {
      const nameBytes = encodeBytes32String(req.name.slice(0, 31));
      await client.publicClient.simulateContract({
        address:      req.vaultAddress,
        abi:          AUTO_SAVE_VAULT_ABI,
        functionName: "renameLock",
        args:         [req.lockId, nameBytes],
        account:      client.walletClient?.account?.address,
      });
      return 0n;
    },

    write: async () => {
      if (!client.walletClient?.account) {
        throw BlinErrors.unauthorizedCaller("anonymous", "connected wallet");
      }
      const nameBytes = encodeBytes32String(req.name.slice(0, 31));
      const { request } = await client.publicClient.simulateContract({
        address:      req.vaultAddress,
        abi:          AUTO_SAVE_VAULT_ABI,
        functionName: "renameLock",
        args:         [req.lockId, nameBytes],
        account:      client.walletClient.account.address,
      });
      return client.walletClient.writeContract(request);
    },
  };
}

// ─── Public: claimTestTokens (testnet only) ───────────────────────────────────
// Calls faucet() on the vault's underlying MockERC20 asset.
// Mints 10,000 tokens to the caller — no auth required on testnet.
// Returns the tx hash so the caller can await the receipt.

export function claimTestTokens(
  client: BlinClient,
  vaultAddress: Address,
): ResultAsync<`0x${string}`, BlinError> {
  return ResultAsync.fromPromise(
    (async () => {
      if (!client.walletClient?.account) {
        throw BlinErrors.unauthorizedCaller("anonymous", "connected wallet");
      }
      const caller = client.walletClient.account.address as Address;

      // Resolve the USDC token address from the vault (testnet: MockERC20)
      const assetAddress = await client.publicClient.readContract({
        address: vaultAddress,
        abi:     AUTO_SAVE_VAULT_ABI,
        functionName: "usdc",
      }) as Address;

      const { request } = await client.publicClient.simulateContract({
        address:      assetAddress,
        abi:          MOCK_ERC20_ABI,
        functionName: "faucet",
        args:         [],
        account:      caller,
      });

      return client.walletClient.writeContract(request) as Promise<`0x${string}`>;
    })(),
    toBlinError,
  );
}

// ─── Public: breakLock ────────────────────────────────────────────────────────

export function breakLock(
  client: BlinClient,
  req: BreakLockRequest,
): ContractInteraction<BreakLockRequest> {
  return {
    request: req,

    simulate: async () => {
      // Returns expected penalty in wei for UI preview
      const lock = await client.publicClient.readContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "getLock",
        args: [req.lockId],
      }) as RawLock;

      const penalty = (lock.principal * 1500n) / 10_000n;

      await client.publicClient.simulateContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "breakLock",
        args: [req.lockId],
        account: client.walletClient?.account?.address,
      });

      return penalty;
    },

    write: async () => {
      if (!client.walletClient?.account) {
        throw BlinErrors.unauthorizedCaller("anonymous", "connected wallet");
      }

      const { request } = await client.publicClient.simulateContract({
        address: req.vaultAddress,
        abi: AUTO_SAVE_VAULT_ABI,
        functionName: "breakLock",
        args: [req.lockId],
        account: client.walletClient.account.address,
      });

      return client.walletClient.writeContract(request);
    },
  };
}

// ─── Public: getClaimableBlin ─────────────────────────────────────────────────
//
// Returns the total $BLIN wei accumulated by a user from all matured USDC
// withdrawals. This is the authoritative record on BSC that the backend reads
// to issue claim vouchers on Ethereum via BlinYieldDistributor.

export function getClaimableBlin(
  client: BlinClient,
  vaultAddress: Address,
  user: Address,
): ResultAsync<bigint, BlinError> {
  const parsedVault = addressSchema.safeParse(vaultAddress);
  const parsedUser  = addressSchema.safeParse(user);

  if (!parsedVault.success) return errAsync(BlinErrors.validation("vaultAddress", vaultAddress));
  if (!parsedUser.success)  return errAsync(BlinErrors.validation("user", user));

  return ResultAsync.fromPromise(
    client.publicClient.readContract({
      address:      parsedVault.data,
      abi:          AUTO_SAVE_VAULT_ABI,
      functionName: "claimableBlin",
      args:         [parsedUser.data],
    }).then((v) => v as bigint),
    toBlinError,
  );
}

// ─── Public: previewReward ────────────────────────────────────────────────────
//
// Returns the $BLIN wei yield that will be earned for a given USDC amount and
// lock duration. Matches AutoSaveVault.previewReward(amount, duration).

export function previewReward(
  client: BlinClient,
  vaultAddress: Address,
  amount: bigint,
  durationSeconds: bigint,
): ResultAsync<bigint, BlinError> {
  const parsedVault = addressSchema.safeParse(vaultAddress);
  if (!parsedVault.success) return errAsync(BlinErrors.validation("vaultAddress", vaultAddress));

  return ResultAsync.fromPromise(
    client.publicClient.readContract({
      address:      parsedVault.data,
      abi:          AUTO_SAVE_VAULT_ABI,
      functionName: "previewReward",
      args:         [amount, durationSeconds],
    }).then((v) => v as bigint),
    toBlinError,
  );
}
