import type { Abi } from "viem";

// ─── Lock struct (AutoSaveVault) ──────────────────────────────────────────────
//
// struct Lock {
//   uint256 id;
//   address owner;
//   uint256 principal;    // USDC wei locked
//   uint256 lockedAt;
//   uint256 lockedUntil;
//   uint256 blinReward;   // $BLIN wei earned on matured withdrawal
//   bytes32 name;
//   bool    settled;
// }
//
// Note: $BLIN yield is tracked as a number only on BSC (claimableBlin mapping).
// No $BLIN token is transferred on BSC — claim happens on Ethereum via
// BlinYieldDistributor using an EIP-712 voucher signed by the backend.
// ─────────────────────────────────────────────────────────────────────────────

const LOCK_TUPLE = {
  name: "",
  type: "tuple",
  components: [
    { name: "id",          type: "uint256"  },
    { name: "owner",       type: "address"  },
    { name: "principal",   type: "uint256"  },
    { name: "lockedAt",    type: "uint256"  },
    { name: "lockedUntil", type: "uint256"  },
    { name: "blinReward",  type: "uint256"  },
    { name: "name",        type: "bytes32"  },
    { name: "settled",     type: "bool"     },
  ],
} as const;

// ─── AutoSaveVault ABI (BSC) ──────────────────────────────────────────────────

export const AUTO_SAVE_VAULT_ABI = [
  // ─── Write ──────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "createLock",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount",   type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "name",     type: "bytes32" },
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
      { name: "lockId",  type: "uint256" },
      { name: "newName", type: "bytes32" },
    ],
    outputs: [],
  },

  // ─── Admin ───────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "setRewardRate",
    stateMutability: "nonpayable",
    inputs: [{ name: "newRate", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setTreasury",
    stateMutability: "nonpayable",
    inputs: [{ name: "newTreasury", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "grantRole",
    stateMutability: "nonpayable",
    inputs: [
      { name: "role",    type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [],
  },

  // ─── View ────────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "getLock",
    stateMutability: "view",
    inputs: [{ name: "lockId", type: "uint256" }],
    outputs: [LOCK_TUPLE],
  },
  {
    type: "function",
    name: "getUserLocks",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ ...LOCK_TUPLE, type: "tuple[]" }],
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
    name: "claimableBlin",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewReward",
    stateMutability: "view",
    inputs: [
      { name: "amount",   type: "uint256" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "rewardRate",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalLocked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "nextLockId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MIN_LOCK",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MAX_LOCK",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "PENALTY_BPS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "OPERATOR_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role",    type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // ─── Events ──────────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "LockCreated",
    inputs: [
      { name: "owner",       type: "address", indexed: true  },
      { name: "lockId",      type: "uint256", indexed: true  },
      { name: "principal",   type: "uint256", indexed: false },
      { name: "lockedUntil", type: "uint256", indexed: false },
      { name: "blinReward",  type: "uint256", indexed: false },
      { name: "name",        type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LockToppedUp",
    inputs: [
      { name: "owner",         type: "address", indexed: true  },
      { name: "lockId",        type: "uint256", indexed: true  },
      { name: "added",         type: "uint256", indexed: false },
      { name: "newPrincipal",  type: "uint256", indexed: false },
      { name: "newBlinReward", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LockWithdrawn",
    inputs: [
      { name: "owner",     type: "address", indexed: true  },
      { name: "lockId",    type: "uint256", indexed: true  },
      { name: "principal", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LockBroken",
    inputs: [
      { name: "owner",    type: "address", indexed: true  },
      { name: "lockId",   type: "uint256", indexed: true  },
      { name: "returned", type: "uint256", indexed: false },
      { name: "penalty",  type: "uint256", indexed: false },
    ],
  },
  {
    /// @notice The backend listens for this event to issue $BLIN claim vouchers
    ///         on Ethereum via BlinYieldDistributor.
    type: "event",
    name: "BlinYieldFinalized",
    inputs: [
      { name: "user",            type: "address", indexed: true  },
      { name: "lockId",          type: "uint256", indexed: true  },
      { name: "blinAmount",      type: "uint256", indexed: false },
      { name: "totalClaimable",  type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LockRenamed",
    inputs: [
      { name: "owner",   type: "address", indexed: true  },
      { name: "lockId",  type: "uint256", indexed: true  },
      { name: "newName", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RewardRateUpdated",
    inputs: [
      { name: "oldRate", type: "uint256", indexed: false },
      { name: "newRate", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TreasuryUpdated",
    inputs: [
      { name: "oldTreasury", type: "address", indexed: false },
      { name: "newTreasury", type: "address", indexed: false },
    ],
  },

  // ─── Custom errors ────────────────────────────────────────────────────────────
  { type: "error", name: "LockDoesNotExist",    inputs: [{ name: "lockId", type: "uint256" }] },
  { type: "error", name: "LockAlreadySettled",  inputs: [{ name: "lockId", type: "uint256" }] },
  { type: "error", name: "LockNotMatured",      inputs: [{ name: "lockId", type: "uint256" }, { name: "maturesAt", type: "uint256" }, { name: "now_", type: "uint256" }] },
  { type: "error", name: "LockAlreadyMatured",  inputs: [{ name: "lockId", type: "uint256" }, { name: "maturedAt", type: "uint256" }] },
  { type: "error", name: "InvalidLockDuration", inputs: [{ name: "duration", type: "uint256" }, { name: "min", type: "uint256" }, { name: "max", type: "uint256" }] },
  { type: "error", name: "ZeroAmount",          inputs: [] },
  { type: "error", name: "ZeroAddress",         inputs: [] },
  { type: "error", name: "Unauthorised",        inputs: [{ name: "caller", type: "address" }] },
  // OZ v5 ERC-20 errors (bubble up through safeTransferFrom inside createLock / topUp)
  { type: "error", name: "ERC20InsufficientBalance",   inputs: [{ name: "sender",    type: "address" }, { name: "balance",   type: "uint256" }, { name: "needed",    type: "uint256" }] },
  { type: "error", name: "ERC20InsufficientAllowance", inputs: [{ name: "spender",   type: "address" }, { name: "allowance", type: "uint256" }, { name: "needed",    type: "uint256" }] },
] as const satisfies Abi;

// ─── VaultFactory ABI (BSC) ───────────────────────────────────────────────────

export const VAULT_FACTORY_ABI = [
  // ─── Write ───────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "getOrCreateVault",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "setTreasury",
    stateMutability: "nonpayable",
    inputs: [{ name: "newTreasury", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setSaveSwap",
    stateMutability: "nonpayable",
    inputs: [{ name: "newSaveSwap", type: "address" }],
    outputs: [],
  },

  // ─── View ────────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "getVault",
    stateMutability: "view",
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
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "saveSwap",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // ─── Events ──────────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "user",  type: "address", indexed: true  },
      { name: "vault", type: "address", indexed: false },
    ],
  },

  // ─── Custom errors ────────────────────────────────────────────────────────────
  { type: "error", name: "ZeroAddress", inputs: [] },
] as const satisfies Abi;

// ─── SaveSwap ABI (BSC) ───────────────────────────────────────────────────────
//
// SwapParams struct:
//   tokenIn:      address — use NATIVE (0xEeee…EeE) for BNB input
//   tokenOut:     address — use NATIVE for BNB output
//   amountIn:     uint256 — ignored when tokenIn == NATIVE; use msg.value instead
//   minAmountOut: uint256 — slippage protection on main swap
//   saveBps:      uint256 — 0–5000 (0–50%), 0 = skip save
//   minSaveUsdc:  uint256 — slippage on save→USDC leg (0 = skip)
//   lockDuration: uint256 — seconds [MIN_LOCK, MAX_LOCK]
//   pathMain:     address[] — PancakeSwap path for main swap
//   pathSave:     address[] — PancakeSwap path for save→USDC; empty if tokenOut==USDC
//   deadline:     uint256
// ─────────────────────────────────────────────────────────────────────────────

export const SAVE_SWAP_ABI = [
  // ─── Write ───────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "swapAndSave",
    stateMutability: "payable",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "tokenIn",      type: "address"   },
          { name: "tokenOut",     type: "address"   },
          { name: "amountIn",     type: "uint256"   },
          { name: "minAmountOut", type: "uint256"   },
          { name: "saveBps",      type: "uint256"   },
          { name: "minSaveUsdc",  type: "uint256"   },
          { name: "lockDuration", type: "uint256"   },
          { name: "pathMain",     type: "address[]" },
          { name: "pathSave",     type: "address[]" },
          { name: "deadline",     type: "uint256"   },
        ],
      },
    ],
    outputs: [{ name: "lockId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setVaultFactory",
    stateMutability: "nonpayable",
    inputs: [{ name: "newFactory", type: "address" }],
    outputs: [],
  },

  // ─── View ────────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "NATIVE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "MAX_SAVE_BPS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "router",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "wbnb",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "vaultFactory",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // ─── Events ──────────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "SwapAndSaved",
    inputs: [
      { name: "user",      type: "address", indexed: true  },
      { name: "tokenIn",   type: "address", indexed: false },
      { name: "tokenOut",  type: "address", indexed: false },
      { name: "amountIn",  type: "uint256", indexed: false },
      { name: "amountOut", type: "uint256", indexed: false },
      { name: "usdcSaved", type: "uint256", indexed: false },
      { name: "lockId",    type: "uint256", indexed: false },
      { name: "saveBps",   type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VaultFactoryUpdated",
    inputs: [
      { name: "oldFactory", type: "address", indexed: true },
      { name: "newFactory", type: "address", indexed: true },
    ],
  },

  // ─── Custom errors ────────────────────────────────────────────────────────────
  { type: "error", name: "ZeroAmount",           inputs: [] },
  { type: "error", name: "ZeroAddress",          inputs: [] },
  { type: "error", name: "InvalidSaveBps",       inputs: [{ name: "bps",      type: "uint256" }] },
  { type: "error", name: "DeadlinePassed",       inputs: [{ name: "deadline", type: "uint256" }, { name: "current", type: "uint256" }] },
  { type: "error", name: "SwapFailed",           inputs: [] },
  { type: "error", name: "NativeTransferFailed", inputs: [] },
  { type: "error", name: "InvalidPath",          inputs: [] },
] as const satisfies Abi;

// ─── BlinYieldDistributor ABI (Ethereum Mainnet) ──────────────────────────────
//
// Holds the real $BLIN supply (0xaEFB54306240502c5421Be478fa16aACfA9698A2).
// Users claim rewards by submitting an EIP-712 signed voucher issued by the
// backend after it detects a BlinYieldFinalized event on BSC.
//
// EIP-712 domain:
//   name    = "BlinYieldDistributor"
//   version = "1"
//   chainId = 1 (Ethereum)
//
// Claim type hash:
//   keccak256("Claim(address user,uint256 amount,bytes32 nonce,uint256 deadline)")
//
// Recommended nonce convention:
//   keccak256(abi.encode(BSC_CHAIN_ID=56, lockId, userAddress))
// ─────────────────────────────────────────────────────────────────────────────

export const BLIN_YIELD_DISTRIBUTOR_ABI = [
  // ─── Write ───────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount",    type: "uint256" },
      { name: "nonce",     type: "bytes32" },
      { name: "deadline",  type: "uint256" },
      { name: "signature", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setSigner",
    stateMutability: "nonpayable",
    inputs: [{ name: "newSigner", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawFunds",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },

  // ─── View ────────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "hashClaim",
    stateMutability: "view",
    inputs: [
      { name: "user",     type: "address" },
      { name: "amount",   type: "uint256" },
      { name: "nonce",    type: "bytes32" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "blinReserve",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "blin",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "signer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "usedNonces",
    stateMutability: "view",
    inputs: [{ name: "nonce", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "totalClaimed",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "CLAIM_TYPEHASH",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // ─── Events ──────────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "BlinClaimed",
    inputs: [
      { name: "user",   type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
      { name: "nonce",  type: "bytes32", indexed: true  },
    ],
  },
  {
    type: "event",
    name: "SignerUpdated",
    inputs: [
      { name: "oldSigner", type: "address", indexed: true },
      { name: "newSigner", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "FundsWithdrawn",
    inputs: [
      { name: "to",     type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },

  // ─── Custom errors ────────────────────────────────────────────────────────────
  { type: "error", name: "InvalidSignature",         inputs: [] },
  { type: "error", name: "VoucherExpired",           inputs: [{ name: "deadline", type: "uint256" }, { name: "current", type: "uint256" }] },
  { type: "error", name: "VoucherAlreadyUsed",       inputs: [{ name: "nonce",    type: "bytes32" }] },
  { type: "error", name: "ZeroAmount",               inputs: [] },
  { type: "error", name: "ZeroAddress",              inputs: [] },
  { type: "error", name: "InsufficientBlinBalance",  inputs: [{ name: "required",  type: "uint256" }, { name: "available", type: "uint256" }] },
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
    outputs: [{ name: "ok", type: "bool" }],
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
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "ok", type: "bool" }],
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from",   type: "address" },
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "ok", type: "bool" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // OZ v5 errors — useful when viem parses transfer/approve reverts
  { type: "error", name: "ERC20InsufficientBalance",   inputs: [{ name: "sender",    type: "address" }, { name: "balance",   type: "uint256" }, { name: "needed",    type: "uint256" }] },
  { type: "error", name: "ERC20InsufficientAllowance", inputs: [{ name: "spender",   type: "address" }, { name: "allowance", type: "uint256" }, { name: "needed",    type: "uint256" }] },
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
