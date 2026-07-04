import { ResultAsync, errAsync } from "neverthrow";
import { z } from "zod";
import {
  BlinErrors,
  CONTRACT_ADDRESSES,
  TESTNET_CONTRACT_ADDRESSES,
  isSupportedChainId,
  type BlinError,
  type SupportedChainId,
} from "@blin/shared";
import {
  encodeFunctionData,
  decodeFunctionResult,
  type Address,
} from "viem";
import type { BlinClient } from "./client";
import { SAVE_SWAP_ABI, ERC20_ABI } from "./abis";
import type { QuoteRequest, QuoteResult, SwapWithSaveRequest, SwapWithSaveResult } from "./types";

// ─── Input validation ──────────────────────────────────────────────────────────

const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/) as z.ZodType<Address>;

const supportedChainIdSchema = z
  .number()
  .int()
  .positive()
  .refine(isSupportedChainId, { message: "Unsupported chain ID" }) as z.ZodType<SupportedChainId>;

const quoteRequestSchema = z.object({
  chainId:     supportedChainIdSchema,
  tokenIn:     addressSchema,
  tokenOut:    addressSchema,
  amountIn:    z.bigint().positive(),
  slippageBps: z.number().int().min(1).max(5000),
});

const swapRequestSchema = z.object({
  saveBps:   z.number().int().min(0).max(5000),
  deadline:  z.bigint().positive(),
  tokenIn:   addressSchema,
  tokenOut:  addressSchema,
  amountIn:  z.bigint().positive(),
});

// ─── NATIVE sentinel (mirrors SaveSwap.NATIVE) ───────────────────────────────

/** EIP-7528 sentinel for native ETH / BNB input/output. */
export const NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;

// ─── On-chain router addresses ────────────────────────────────────────────────

/** Wrapped native token per chain (WETH / WBNB). */
const WRAPPED_NATIVE: Partial<Record<number, Address>> = {
  1:      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  56:     "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  42161:  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH on Arbitrum
  97:     "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", // WBNB testnet
  421614: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73", // WETH on Arb Sepolia
};

/** PancakeSwap V2 Router02 — BSC mainnet + testnet. */
const PANCAKE_V2_ROUTER: Partial<Record<number, Address>> = {
  56: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  97: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
};

/** Uniswap V3 SwapRouter02 — same address on mainnet and Arbitrum. */
export const UNISWAP_V3_ROUTER: Partial<Record<number, Address>> = {
  1:     "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  42161: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
};

/** Uniswap V3 QuoterV2 — same address on mainnet and Arbitrum. */
const UNISWAP_V3_QUOTER: Partial<Record<number, Address>> = {
  1:     "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  42161: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
};

/** Mock router on Arb Sepolia (V2-compatible interface). */
const MOCK_ROUTER: Partial<Record<number, Address>> = {
  421614: "0xC8c8c44Aa3b4107f90Cd893E4c142D349f50782d",
};

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────

const PANCAKE_V2_ABI = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

// QuoterV2 is marked nonpayable (not view) so we call it via publicClient.call()
// with manually encoded calldata, bypassing viem's stateMutability type check.
const UNISWAP_V3_QUOTER_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn",           type: "address" },
          { name: "tokenOut",          type: "address" },
          { name: "amountIn",          type: "uint256" },
          { name: "fee",               type: "uint24"  },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut",               type: "uint256" },
      { name: "sqrtPriceX96After",       type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32"  },
      { name: "gasEstimate",             type: "uint256" },
    ],
  },
] as const;

// ─── PancakeSwap V2 on-chain quote ────────────────────────────────────────────

async function quotePancakeV2(
  client:        BlinClient,
  routerAddress: Address,
  tokenIn:       Address,
  tokenOut:      Address,
  amountIn:      bigint,
  wNative:       Address,
): Promise<bigint | null> {
  const tIn  = tokenIn.toLowerCase()  === NATIVE_ADDRESS.toLowerCase() ? wNative : tokenIn;
  const tOut = tokenOut.toLowerCase() === NATIVE_ADDRESS.toLowerCase() ? wNative : tokenOut;
  if (tIn.toLowerCase() === tOut.toLowerCase()) return null;

  const paths: Address[][] = [[tIn, tOut]];
  if (tIn.toLowerCase() !== wNative.toLowerCase() && tOut.toLowerCase() !== wNative.toLowerCase()) {
    paths.push([tIn, wNative, tOut]);
  }

  for (const path of paths) {
    try {
      const amounts = await client.publicClient.readContract({
        address:      routerAddress,
        abi:          PANCAKE_V2_ABI,
        functionName: "getAmountsOut",
        args:         [amountIn, path],
      });
      const out = amounts[amounts.length - 1];
      if (out && out > 0n) return out;
    } catch {
      // No pool for this path — try next
    }
  }
  return null;
}

// ─── Uniswap V3 on-chain quote ────────────────────────────────────────────────

const V3_FEE_TIERS = [100, 500, 3_000, 10_000] as const;

async function quoteUniswapV3(
  client:        BlinClient,
  quoterAddress: Address,
  tokenIn:       Address,
  tokenOut:      Address,
  amountIn:      bigint,
  wNative:       Address,
): Promise<{ amountOut: bigint; fee: number } | null> {
  const tIn  = tokenIn.toLowerCase()  === NATIVE_ADDRESS.toLowerCase() ? wNative : tokenIn;
  const tOut = tokenOut.toLowerCase() === NATIVE_ADDRESS.toLowerCase() ? wNative : tokenOut;
  if (tIn.toLowerCase() === tOut.toLowerCase()) return null;

  let best: { amountOut: bigint; fee: number } | null = null;

  const results = await Promise.allSettled(
    V3_FEE_TIERS.map(async (fee) => {
      const callData = encodeFunctionData({
        abi:          UNISWAP_V3_QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args: [{ tokenIn: tIn, tokenOut: tOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
      });

      const { data } = await client.publicClient.call({
        to:   quoterAddress,
        data: callData,
      });
      if (!data) return null;

      const decoded = decodeFunctionResult({
        abi:          UNISWAP_V3_QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        data,
      }) as [bigint, bigint, number, bigint];

      const amountOut = decoded[0];
      if (!amountOut || amountOut === 0n) return null;
      return { amountOut, fee };
    }),
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      if (!best || r.value.amountOut > best.amountOut) best = r.value;
    }
  }

  return best;
}

// ─── Public: getQuote ─────────────────────────────────────────────────────────
//
// Queries on-chain Quoter contracts directly:
//   BSC (56) + testnet (97):   PancakeSwap V2 Router.getAmountsOut()
//   ETH (1) + Arbitrum (42161): Uniswap V3 QuoterV2.quoteExactInputSingle()
//
// For web-app usage, prefer calling /api/quote (server-side route) which
// avoids browser CORS limitations on public BSC RPCs.

export function getQuote(
  client: BlinClient,
  req: QuoteRequest,
): ResultAsync<QuoteResult, BlinError> {
  const parsed = quoteRequestSchema.safeParse(req);
  if (!parsed.success) {
    return errAsync(BlinErrors.validation("quoteRequest", req));
  }

  return ResultAsync.fromPromise(
    (async (): Promise<QuoteResult> => {
      const { chainId, tokenIn, tokenOut, amountIn, slippageBps } = parsed.data;
      const wNative = WRAPPED_NATIVE[chainId];
      if (!wNative) throw new Error("no_quotes");

      let amountOut: bigint | null = null;
      let provider: QuoteResult["provider"] = "pancakeswap-v2";

      const pancakeAddr = PANCAKE_V2_ROUTER[chainId] ?? MOCK_ROUTER[chainId];
      const uniswapAddr = UNISWAP_V3_QUOTER[chainId];

      if (pancakeAddr) {
        amountOut = await quotePancakeV2(client, pancakeAddr, tokenIn, tokenOut, amountIn, wNative);
        provider  = (chainId as number) === 97 || (chainId as number) === 421614 ? "mock" : "pancakeswap-v2";
      } else if (uniswapAddr) {
        const result = await quoteUniswapV3(client, uniswapAddr, tokenIn, tokenOut, amountIn, wNative);
        if (result) amountOut = result.amountOut;
        provider = "uniswap-v3";
      }

      if (!amountOut || amountOut === 0n) throw new Error("no_quotes");

      const slip        = BigInt(slippageBps);
      const amountOutMin = amountOut - (amountOut * slip) / 10_000n;

      return {
        amountOut,
        amountOutMin,
        route:          [],
        gasEstimate:    0n,
        priceImpactBps: 0,
        provider,
      };
    })(),
    (err) => {
      if (err instanceof Error && err.message === "no_quotes") {
        return BlinErrors.insufficientLiquidity(req.tokenIn, req.tokenOut, req.amountIn);
      }
      return BlinErrors.rpc("Quote fetch failed", undefined, err);
    },
  );
}

// ─── Public: executeSwapWithSave ─────────────────────────────────────────────
//
// Executes a swap via SaveSwap.swapAndSave():
//   1. Pulls tokenIn from caller (ERC-20) or forwards msg.value (native).
//   2. Swaps tokenIn → tokenOut via pathMain on the chain's DEX router.
//   3. Saves saveBps% of tokenOut as a time-locked USDC position in the
//      caller's AutoSaveVault (converting via pathSave if tokenOut ≠ USDC).
//   4. Returns the remainder to the caller.

export function executeSwapWithSave(
  client: BlinClient,
  req: SwapWithSaveRequest,
): ResultAsync<SwapWithSaveResult, BlinError> {
  const parsed = swapRequestSchema.safeParse(req);
  if (!parsed.success) {
    return errAsync(BlinErrors.validation("swapRequest", req));
  }

  const walletClient = client.walletClient;
  const account      = walletClient?.account;
  if (!account) {
    return errAsync(BlinErrors.unauthorizedCaller("anonymous", "connected wallet"));
  }

  const addrs = (client.chainId in TESTNET_CONTRACT_ADDRESSES
    ? TESTNET_CONTRACT_ADDRESSES[client.chainId as keyof typeof TESTNET_CONTRACT_ADDRESSES]
    : CONTRACT_ADDRESSES[client.chainId as keyof typeof CONTRACT_ADDRESSES]) ?? CONTRACT_ADDRESSES[56];

  const saveSwapAddress = addrs.saveSwap as Address;
  if (saveSwapAddress === "0x0000000000000000000000000000000000000000") {
    return errAsync(BlinErrors.rpc(`SaveSwap not deployed on chain ${client.chainId}`));
  }

  const caller     = account.address as Address;
  const isNativeIn = req.tokenIn.toLowerCase() === NATIVE_ADDRESS.toLowerCase();
  const usdcAddress = (addrs as { usdc?: Address }).usdc
    ?? ("0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as Address);

  const pathMain     = req.pathMain ?? [req.tokenIn, req.tokenOut];
  const isUsdcOut    = req.tokenOut.toLowerCase() === usdcAddress.toLowerCase();
  const pathSave     = req.pathSave ?? (isUsdcOut ? [] : [req.tokenOut, usdcAddress]);
  const lockDuration = req.lockDuration ?? 2_592_000n; // 30 days default

  return ResultAsync.fromPromise(
    (async (): Promise<SwapWithSaveResult> => {
      // ── 1. Approve SaveSwap to spend tokenIn (ERC-20 only) ──────────────────
      if (!isNativeIn) {
        const allowance = await client.publicClient.readContract({
          address:      req.tokenIn,
          abi:          ERC20_ABI,
          functionName: "allowance",
          args:         [caller, saveSwapAddress],
        }) as bigint;

        if (allowance < req.amountIn) {
          const { request: approveReq } = await client.publicClient.simulateContract({
            address:      req.tokenIn,
            abi:          ERC20_ABI,
            functionName: "approve",
            args:         [saveSwapAddress, req.amountIn],
            account:      caller,
          });
          const approveHash = await walletClient.writeContract(approveReq);
          await client.publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      // ── 2. Build SwapParams ──────────────────────────────────────────────────
      const swapParams = {
        tokenIn:      req.tokenIn,
        tokenOut:     req.tokenOut,
        amountIn:     req.amountIn,
        minAmountOut: req.quote.amountOutMin,
        saveBps:      BigInt(req.saveBps),
        minSaveUsdc:  req.minSaveUsdc ?? 0n,
        lockDuration,
        pathMain,
        pathSave,
        deadline:     req.deadline,
      } as const;

      // ── 3. Simulate & write swapAndSave ──────────────────────────────────────
      const { request: swapReq, result: lockIdResult } =
        await client.publicClient.simulateContract({
          address:      saveSwapAddress,
          abi:          SAVE_SWAP_ABI,
          functionName: "swapAndSave" as const,
          args:         [swapParams] as const,
          account:      caller,
          ...(isNativeIn ? { value: req.amountIn } : {}),
        });

      const txHash = await walletClient.writeContract(swapReq);
      const lockId = lockIdResult as bigint;

      // ── 4. Resolve vault address ─────────────────────────────────────────────
      await client.publicClient.waitForTransactionReceipt({ hash: txHash });

      const factoryAddress = (addrs as { vaultFactory?: Address }).vaultFactory
        ?? ("0x0000000000000000000000000000000000000000" as Address);

      let vaultAddress: Address = "0x0000000000000000000000000000000000000000";
      if (factoryAddress !== "0x0000000000000000000000000000000000000000") {
        vaultAddress = await client.publicClient.readContract({
          address:      factoryAddress,
          abi:          [{ type: "function", name: "getVault", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "address" }] }],
          functionName: "getVault",
          args:         [caller],
        }) as Address;
      }

      return { txHash, lockId, vaultAddress };
    })(),
    (err) => BlinErrors.rpc("Swap execution failed", undefined, err),
  );
}
