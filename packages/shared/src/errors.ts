// ─── BlinError discriminated union ───────────────────────────────────────────
// Every error in the Blin Finance stack is one of these.
// Never throw `new Error("string")` — construct one of these instead.

export type BlinError =
  | InsufficientLiquidityError
  | SlippageError
  | VaultNotInitializedError
  | LockNotMaturedError
  | LockDoesNotExistError
  | InvalidLockDurationError
  | LockAlreadyBrokenError
  | UnauthorizedCallerError
  | ZeroAmountError
  | InsufficientBalanceError
  | NetworkError
  | RpcError
  | ValidationError
  | UnknownError;

interface BlinErrorBase {
  readonly _tag: string;
  readonly message: string;
}

export interface InsufficientLiquidityError extends BlinErrorBase {
  readonly _tag: "InsufficientLiquidityError";
  readonly tokenIn: string;
  readonly tokenOut: string;
  readonly amountIn: bigint;
}

export interface SlippageError extends BlinErrorBase {
  readonly _tag: "SlippageError";
  readonly expectedMinOut: bigint;
  readonly actualOut: bigint;
}

export interface VaultNotInitializedError extends BlinErrorBase {
  readonly _tag: "VaultNotInitializedError";
  readonly user: string;
}

export interface LockNotMaturedError extends BlinErrorBase {
  readonly _tag: "LockNotMaturedError";
  readonly lockId: bigint;
  readonly lockedUntil: bigint;
  readonly now: bigint;
}

export interface LockDoesNotExistError extends BlinErrorBase {
  readonly _tag: "LockDoesNotExistError";
  readonly lockId: bigint;
}

export interface InvalidLockDurationError extends BlinErrorBase {
  readonly _tag: "InvalidLockDurationError";
  readonly durationSeconds: bigint;
  readonly minSeconds: bigint;
  readonly maxSeconds: bigint;
}

export interface LockAlreadyBrokenError extends BlinErrorBase {
  readonly _tag: "LockAlreadyBrokenError";
  readonly lockId: bigint;
}

export interface UnauthorizedCallerError extends BlinErrorBase {
  readonly _tag: "UnauthorizedCallerError";
  readonly caller: string;
  readonly required: string;
}

export interface ZeroAmountError extends BlinErrorBase {
  readonly _tag: "ZeroAmountError";
}

export interface InsufficientBalanceError extends BlinErrorBase {
  readonly _tag: "InsufficientBalanceError";
  readonly token: string;
  readonly required: bigint;
  readonly available: bigint;
}

export interface NetworkError extends BlinErrorBase {
  readonly _tag: "NetworkError";
  readonly chainId: number;
  readonly cause?: unknown;
}

export interface RpcError extends BlinErrorBase {
  readonly _tag: "RpcError";
  readonly code?: number;
  readonly cause?: unknown;
}

export interface ValidationError extends BlinErrorBase {
  readonly _tag: "ValidationError";
  readonly field: string;
  readonly received: unknown;
}

export interface UnknownError extends BlinErrorBase {
  readonly _tag: "UnknownError";
  readonly cause?: unknown;
}

// ─── Constructors ─────────────────────────────────────────────────────────────

export const BlinErrors = {
  insufficientLiquidity: (
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
  ): InsufficientLiquidityError => ({
    _tag: "InsufficientLiquidityError",
    message: `Insufficient liquidity for ${tokenIn} → ${tokenOut}`,
    tokenIn,
    tokenOut,
    amountIn,
  }),

  slippage: (expectedMinOut: bigint, actualOut: bigint): SlippageError => ({
    _tag: "SlippageError",
    message: `Slippage exceeded: expected min ${expectedMinOut}, got ${actualOut}`,
    expectedMinOut,
    actualOut,
  }),

  vaultNotInitialized: (user: string): VaultNotInitializedError => ({
    _tag: "VaultNotInitializedError",
    message: `No vault deployed for user ${user}`,
    user,
  }),

  lockNotMatured: (lockId: bigint, lockedUntil: bigint, now: bigint): LockNotMaturedError => ({
    _tag: "LockNotMaturedError",
    message: `Lock ${lockId} matures at ${lockedUntil}, current time is ${now}`,
    lockId,
    lockedUntil,
    now,
  }),

  lockDoesNotExist: (lockId: bigint): LockDoesNotExistError => ({
    _tag: "LockDoesNotExistError",
    message: `Lock ${lockId} does not exist`,
    lockId,
  }),

  invalidLockDuration: (
    durationSeconds: bigint,
    minSeconds: bigint,
    maxSeconds: bigint,
  ): InvalidLockDurationError => ({
    _tag: "InvalidLockDurationError",
    message: `Lock duration ${durationSeconds}s is outside allowed range [${minSeconds}, ${maxSeconds}]`,
    durationSeconds,
    minSeconds,
    maxSeconds,
  }),

  lockAlreadyBroken: (lockId: bigint): LockAlreadyBrokenError => ({
    _tag: "LockAlreadyBrokenError",
    message: `Lock ${lockId} has already been broken`,
    lockId,
  }),

  unauthorizedCaller: (caller: string, required: string): UnauthorizedCallerError => ({
    _tag: "UnauthorizedCallerError",
    message: `Caller ${caller} is not authorized. Required: ${required}`,
    caller,
    required,
  }),

  zeroAmount: (): ZeroAmountError => ({
    _tag: "ZeroAmountError",
    message: "Amount must be greater than zero",
  }),

  insufficientBalance: (
    token: string,
    required: bigint,
    available: bigint,
  ): InsufficientBalanceError => ({
    _tag: "InsufficientBalanceError",
    message: `Insufficient balance of ${token}: need ${required}, have ${available}`,
    token,
    required,
    available,
  }),

  network: (chainId: number, cause?: unknown): NetworkError => ({
    _tag: "NetworkError",
    message: `Network error on chain ${chainId}`,
    chainId,
    cause,
  }),

  rpc: (message: string, code?: number, cause?: unknown): RpcError => ({
    _tag: "RpcError",
    message,
    ...(code !== undefined && { code }),
    ...(cause !== undefined && { cause }),
  }),

  validation: (field: string, received: unknown): ValidationError => ({
    _tag: "ValidationError",
    message: `Validation failed for field "${field}"`,
    field,
    received,
  }),

  unknown: (cause?: unknown): UnknownError => ({
    _tag: "UnknownError",
    message: "An unexpected error occurred",
    cause,
  }),
} as const;
