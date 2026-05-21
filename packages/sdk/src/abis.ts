import type { Abi } from "viem";

export const AUTO_SAVE_VAULT_ABI = [
  // ─── Lock struct returned by view functions ──────────────────────────────
  // struct Lock { uint256 amount; uint256 lockedUntil; uint256 createdAt; bytes32 name; bool broken; }

  // ─── Write ────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "createLock",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount",        type: "uint256" },
      { name: "lockDuration",  type: "uint256" },
      { name: "name",          type: "bytes32"  },
    ],
    outputs: [{ name: "lockId", type: "uint256" }],
  },
  {
    type: "function",
    name: "topUp",
    stateMutability: "nonpayable",
    inputs: [
      { name: "lockId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "lockId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "breakLock",
    stateMutability: "nonpayable",
    inputs: [{ name: "lockId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "renameLock",
    stateMutability: "nonpayable",
    inputs: [
      { name: "lockId",   type: "uint256" },
      { name: "newName",  type: "bytes32"  },
    ],
    outputs: [],
  },

  // ─── ERC-20 approval (needed before createLock / topUp) ──────────────────
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // ─── View ─────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "getLock",
    stateMutability: "view",
    inputs: [
      { name: "user",   type: "address" },
      { name: "lockId", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "amount",      type: "uint256" },
          { name: "lockedUntil", type: "uint256" },
          { name: "createdAt",   type: "uint256" },
          { name: "name",        type: "bytes32"  },
          { name: "broken",      type: "bool"     },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getLocks",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "amount",      type: "uint256" },
          { name: "lockedUntil", type: "uint256" },
          { name: "createdAt",   type: "uint256" },
          { name: "name",        type: "bytes32"  },
          { name: "broken",      type: "bool"     },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getLockCount",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "penaltyReceiver",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "yieldStrategy",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "asset",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "totalAssets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // ─── Custom errors (vault) ─────────────────────────────────────────────────
  { type: "error", name: "LockNotMatured",      inputs: [{ name: "lockId", type: "uint256" }, { name: "lockedUntil", type: "uint256" }, { name: "currentTime", type: "uint256" }] },
  { type: "error", name: "LockAlreadyMatured",  inputs: [{ name: "lockId", type: "uint256" }, { name: "lockedUntil", type: "uint256" }, { name: "currentTime", type: "uint256" }] },
  { type: "error", name: "LockDoesNotExist",    inputs: [{ name: "lockId", type: "uint256" }] },
  { type: "error", name: "LockAlreadyBroken",   inputs: [{ name: "lockId", type: "uint256" }] },
  { type: "error", name: "ZeroAmount",          inputs: [] },
  { type: "error", name: "InvalidLockDuration", inputs: [{ name: "duration", type: "uint256" }, { name: "min", type: "uint256" }, { name: "max", type: "uint256" }] },
  // OZ v5 ERC-20 errors — thrown by the underlying asset (USDC) and bubble
  // up through safeTransferFrom inside createLock / topUp.  Adding them here
  // lets viem decode the revert reason instead of showing raw hex 0xe450d38c.
  { type: "error", name: "ERC20InsufficientBalance",  inputs: [{ name: "sender",   type: "address" }, { name: "balance",   type: "uint256" }, { name: "needed",    type: "uint256" }] },
  { type: "error", name: "ERC20InsufficientAllowance", inputs: [{ name: "spender",  type: "address" }, { name: "allowance", type: "uint256" }, { name: "needed",    type: "uint256" }] },
] as const satisfies Abi;

export const VAULT_FACTORY_ABI = [
  {
    type: "function",
    name: "getVault",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getOrCreateVault",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "hasVault",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

export const SAVE_SWAP_ABI = [
  {
    type: "function",
    name: "swapAndSave",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn",        type: "address" },
          { name: "tokenOut",       type: "address" },
          { name: "amountIn",       type: "uint256" },
          { name: "minAmountOut",   type: "uint256" },
          { name: "saveBps",        type: "uint256" },
          { name: "aggregator",     type: "address" },
          { name: "aggregatorData", type: "bytes"   },
          { name: "deadline",       type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "savedAmount", type: "uint256" }],
  },
  {
    type: "function",
    name: "userVaultOverride",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "setVaultOverride",
    stateMutability: "nonpayable",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "vaultFactory",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // ─── Custom errors ─────────────────────────────────────────────────────────
  { type: "error", name: "ZeroAmount",           inputs: [] },
  { type: "error", name: "InvalidSaveBps",       inputs: [{ name: "bps",        type: "uint256" }] },
  { type: "error", name: "SwapFailed",           inputs: [] },
  { type: "error", name: "DeadlinePassed",       inputs: [{ name: "deadline",   type: "uint256" }, { name: "currentTime", type: "uint256" }] },
  { type: "error", name: "UnsupportedAggregator", inputs: [{ name: "aggregator", type: "uint256" }] },
] as const satisfies Abi;

// ─── ERC-20 minimal ABI ───────────────────────────────────────────────────────

export const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // OZ v5 errors — useful when viem parses transfer/approve reverts
  { type: "error", name: "ERC20InsufficientBalance",   inputs: [{ name: "sender",   type: "address" }, { name: "balance",   type: "uint256" }, { name: "needed",    type: "uint256" }] },
  { type: "error", name: "ERC20InsufficientAllowance", inputs: [{ name: "spender",  type: "address" }, { name: "allowance", type: "uint256" }, { name: "needed",    type: "uint256" }] },
] as const satisfies Abi;

// ─── MockERC20 ABI (testnet only) ─────────────────────────────────────────────
// Used to call faucet() on the testnet MockERC20 so users can get test tokens
// without leaving the app.  FAUCET_AMOUNT = 10,000 tokens per call.

export const MOCK_ERC20_ABI = [
  {
    type: "function",
    name: "faucet",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const satisfies Abi;
