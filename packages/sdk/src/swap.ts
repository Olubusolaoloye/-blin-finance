import { ResultAsync, errAsync } from "neverthrow";
import { z } from "zod";
import { BlinErrors, CONTRACT_ADDRESSES, TESTNET_CONTRACT_ADDRESSES, isSupportedChainId, type BlinError, type SupportedChainId } from "@blin/shared";
import type { Address } from "viem";
import type { BlinClient } from "./client";
import { SAVE_SWAP_ABI, ERC20_ABI } from "./abis";
import type { QuoteRequest, QuoteResult, RouteStep, SwapWithSaveRequest, SwapWithSaveResult } from "./types";

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

// ─── Chain → aggregator router addresses ─────────────────────────────────────
// These are the on-chain contracts that SaveSwap's admin must approve.

const PARASWAP_AUGUSTUS: Partial<Record<number, Address>> = {
  1:     "0x6A000F20005980200259B80c5102003040001068",
  56:    "0x6A000F20005980200259B80c5102003040001068",
  42161: "0x6A000F20005980200259B80c5102003040001068",
  // No aggregator on testnets — swaps will show "No route available"
};

const ONEINCH_ROUTER: Partial<Record<number, Address>> = {
  1:     "0x111111125421cA6dc452d289314280a0f8842A65",
  56:    "0x111111125421cA6dc452d289314280a0f8842A65",
  42161: "0x111111125421cA6dc452d289314280a0f8842A65",
};

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 500,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(3, i)));
      }
    }
  }
  throw lastError;
}

// ─── ParaSwap ─────────────────────────────────────────────────────────────────

interface ParaSwapPriceResponse {
  priceRoute: {
    destAmount:     string;
    srcAmount:      string;
    gasCostUSD:     string;
    bestRoute:      Array<{
      swaps: Array<{
        swapExchanges: Array<{ exchange: string; poolAddresses: string[] }>;
        srcToken:  string;
        destToken: string;
        srcAmount: string;
      }>;
    }>;
    tokenTransferProxy: string;
  };
}

async function fetchParaSwapQuote(req: QuoteRequest): Promise<QuoteResult | null> {
  const params = new URLSearchParams({
    srcToken:     req.tokenIn,
    destToken:    req.tokenOut,
    amount:       req.amountIn.toString(),
    srcDecimals:  "18",
    destDecimals: "18",
    side:         "SELL",
    network:      req.chainId.toString(),
    slippage:     (req.slippageBps / 100).toString(),
  });

  const res = await fetch(`https://api.paraswap.io/prices?${params.toString()}`);
  if (!res.ok) return null;

  const data = (await res.json()) as ParaSwapPriceResponse;
  const { priceRoute } = data;
  if (!priceRoute?.destAmount) return null;

  const amountOut = BigInt(priceRoute.destAmount);
  const slippage  = BigInt(req.slippageBps);
  const amountOutMin = amountOut - (amountOut * slippage) / 10_000n;

  const routes: RouteStep[] = priceRoute.bestRoute.flatMap((r) =>
    r.swaps.map((s) => ({
      tokenIn:     s.srcToken  as Address,
      tokenOut:    s.destToken as Address,
      protocol:    s.swapExchanges[0]?.exchange ?? "paraswap",
      poolAddress: (s.swapExchanges[0]?.poolAddresses[0] ?? "0x0") as Address,
      portion:     1,
    })),
  );

  return {
    amountOut,
    amountOutMin,
    route:          routes,
    gasEstimate:    0n,
    priceImpactBps: 0,
    provider:       "paraswap",
  };
}

interface ParaSwapTxResponse {
  data: `0x${string}`;
  to:   string;
}

async function buildParaSwapCalldata(
  req: QuoteRequest,
  slippageBps: number,
): Promise<{ aggregator: Address; calldata: `0x${string}` } | null> {
  // First fetch the price route to get the priceRoute object
  const priceParams = new URLSearchParams({
    srcToken:     req.tokenIn,
    destToken:    req.tokenOut,
    amount:       req.amountIn.toString(),
    srcDecimals:  "18",
    destDecimals: "18",
    side:         "SELL",
    network:      req.chainId.toString(),
  });

  const priceRes = await fetch(`https://api.paraswap.io/prices?${priceParams.toString()}`);
  if (!priceRes.ok) return null;

  const priceData = (await priceRes.json()) as ParaSwapPriceResponse;

  // Then fetch the transaction calldata
  const txRes = await fetch(`https://api.paraswap.io/transactions/${req.chainId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      srcToken:      req.tokenIn,
      destToken:     req.tokenOut,
      srcAmount:     req.amountIn.toString(),
      slippage:      slippageBps,
      priceRoute:    priceData.priceRoute,
      userAddress:   "0x0000000000000000000000000000000000000000",
      txOrigin:      "0x0000000000000000000000000000000000000000",
    }),
  });
  if (!txRes.ok) return null;

  const txData = (await txRes.json()) as ParaSwapTxResponse;
  const aggregator = PARASWAP_AUGUSTUS[req.chainId];
  if (!aggregator) return null;

  return { aggregator, calldata: txData.data };
}

// ─── 1inch ────────────────────────────────────────────────────────────────────

interface OneInchQuoteResponse {
  toAmount: string;
  gas:      number;
  protocols: Array<Array<Array<{ name: string; part: number; fromTokenAddress: string; toTokenAddress: string }>>>;
}

async function fetch1inchQuote(req: QuoteRequest): Promise<QuoteResult | null> {
  const params = new URLSearchParams({
    src:    req.tokenIn,
    dst:    req.tokenOut,
    amount: req.amountIn.toString(),
  });

  const res = await fetch(
    `https://api.1inch.dev/swap/v6.0/${req.chainId}/quote?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as OneInchQuoteResponse;
  if (!data.toAmount) return null;

  const amountOut    = BigInt(data.toAmount);
  const slippage     = BigInt(req.slippageBps);
  const amountOutMin = amountOut - (amountOut * slippage) / 10_000n;

  return {
    amountOut,
    amountOutMin,
    route:          [],
    gasEstimate:    BigInt(data.gas ?? 0),
    priceImpactBps: 0,
    provider:       "1inch",
  };
}

interface OneInchSwapResponse {
  tx: { data: `0x${string}`; to: string };
}

async function build1inchCalldata(
  req: QuoteRequest,
  recipient: Address,
  slippageBps: number,
): Promise<{ aggregator: Address; calldata: `0x${string}` } | null> {
  const params = new URLSearchParams({
    src:            req.tokenIn,
    dst:            req.tokenOut,
    amount:         req.amountIn.toString(),
    from:           recipient,
    slippage:       (slippageBps / 100).toString(),
    disableEstimate: "true",
  });

  const res = await fetch(
    `https://api.1inch.dev/swap/v6.0/${req.chainId}/swap?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as OneInchSwapResponse;
  const aggregator = ONEINCH_ROUTER[req.chainId];
  if (!aggregator) return null;

  return { aggregator, calldata: data.tx.data };
}

// ─── PancakeSwap (BSC only) ───────────────────────────────────────────────────

interface PancakeSwapQuoteResponse {
  outputAmount: string;
  gasEstimate:  number;
}

async function fetchPancakeSwapQuote(req: QuoteRequest): Promise<QuoteResult | null> {
  // PancakeSwap Smart Router v3 is only deployed on BSC (56)
  if (req.chainId !== 56) return null;

  const params = new URLSearchParams({
    tokenInAddress:   req.tokenIn,
    tokenOutAddress:  req.tokenOut,
    amount:           req.amountIn.toString(),
    type:             "exactIn",
    chainId:          req.chainId.toString(),
  });

  const res = await fetch(
    `https://api.pancakeswap.info/api/v3/quote?${params.toString()}`,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as PancakeSwapQuoteResponse;
  if (!data.outputAmount) return null;

  const amountOut    = BigInt(data.outputAmount);
  const slippage     = BigInt(req.slippageBps);
  const amountOutMin = amountOut - (amountOut * slippage) / 10_000n;

  return {
    amountOut,
    amountOutMin,
    route:          [],
    gasEstimate:    BigInt(data.gasEstimate ?? 0),
    priceImpactBps: 0,
    provider:       "pancakeswap",
  };
}

// ─── Public: getQuote ─────────────────────────────────────────────────────────

export function getQuote(
  _client: BlinClient,
  req: QuoteRequest,
): ResultAsync<QuoteResult, BlinError> {
  const parsed = quoteRequestSchema.safeParse(req);
  if (!parsed.success) {
    return errAsync(BlinErrors.validation("quoteRequest", req));
  }

  return ResultAsync.fromPromise(
    withRetry(async () => {
      const [paraswap, oneinch, pancake] = await Promise.allSettled([
        fetchParaSwapQuote(parsed.data),
        fetch1inchQuote(parsed.data),
        fetchPancakeSwapQuote(parsed.data),
      ]);

      const results: QuoteResult[] = [];
      for (const r of [paraswap, oneinch, pancake]) {
        if (r.status === "fulfilled" && r.value !== null) {
          results.push(r.value);
        }
      }

      if (results.length === 0) {
        throw new Error("no_quotes");
      }

      // Best quote = highest amountOut
      return results.reduce((best, cur) =>
        cur.amountOut > best.amountOut ? cur : best,
      );
    }),
    (err) => {
      if (err instanceof Error && err.message === "no_quotes") {
        return BlinErrors.insufficientLiquidity(req.tokenIn, req.tokenOut, req.amountIn);
      }
      return BlinErrors.rpc("Quote fetch failed", undefined, err);
    },
  );
}

// ─── Public: executeSwapWithSave ─────────────────────────────────────────────

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
    : CONTRACT_ADDRESSES[client.chainId as keyof typeof CONTRACT_ADDRESSES]) ?? CONTRACT_ADDRESSES[1];
  const saveSwapAddress = addrs.saveSwap;
  if (saveSwapAddress === "0x0000000000000000000000000000000000000000") {
    return errAsync(BlinErrors.rpc(`SaveSwap not deployed on chain ${client.chainId}`));
  }

  const caller = account.address as Address;

  return ResultAsync.fromPromise(
    (async (): Promise<SwapWithSaveResult> => {
      // 1. Resolve calldata from the quote's provider
      const slippageBps = req.quote.amountOut > 0n
        ? Number((req.quote.amountOut - req.quote.amountOutMin) * 10_000n / req.quote.amountOut)
        : 50;

      const quoteReq: QuoteRequest = {
        chainId:  client.chainId,
        tokenIn:  req.tokenIn,
        tokenOut: req.tokenOut,
        amountIn: req.amountIn,
        slippageBps,
      };

      let aggData: { aggregator: Address; calldata: `0x${string}` } | null = null;

      if (req.quote.provider === "paraswap") {
        aggData = await buildParaSwapCalldata(quoteReq, quoteReq.slippageBps);
      } else if (req.quote.provider === "1inch") {
        aggData = await build1inchCalldata(quoteReq, caller, quoteReq.slippageBps);
      }

      // PancakeSwap calldata-building is deferred to Phase 4 (requires SDK)
      if (!aggData) {
        throw new Error("calldata_unavailable");
      }

      // 2. Ensure SaveSwap has approval for tokenIn
      const tokenInDecimals = await client.publicClient.readContract({
        address: req.tokenIn,
        abi: ERC20_ABI,
        functionName: "decimals",
      }) as number;
      void tokenInDecimals;

      const existing = await client.publicClient.readContract({
        address: req.tokenIn,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [caller, saveSwapAddress],
      }) as bigint;

      if (existing < req.amountIn) {
        const { request: approveReq } = await client.publicClient.simulateContract({
          address: req.tokenIn,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [saveSwapAddress, req.amountIn],
          account: caller,
        });
        await walletClient.writeContract(approveReq);
      }

      // 3. Resolve vault address for the user
      let vaultAddress = req.vaultAddress;
      if (!vaultAddress) {
        const override = await client.publicClient.readContract({
          address: saveSwapAddress,
          abi: SAVE_SWAP_ABI,
          functionName: "userVaultOverride",
          args: [caller],
        }) as Address;
        vaultAddress = override !== "0x0000000000000000000000000000000000000000"
          ? override
          : caller; // SaveSwap will resolve via factory if needed
      }

      // 4. Execute swapAndSave
      const { request: swapReq, result: savedAmountResult } =
        await client.publicClient.simulateContract({
          address: saveSwapAddress,
          abi: SAVE_SWAP_ABI,
          functionName: "swapAndSave",
          args: [
            {
              tokenIn:        req.tokenIn,
              tokenOut:       req.tokenOut,
              amountIn:       req.amountIn,
              minAmountOut:   req.quote.amountOutMin,
              saveBps:        BigInt(req.saveBps),
              aggregator:     aggData.aggregator,
              aggregatorData: aggData.calldata,
              deadline:       req.deadline,
            },
          ],
          account: caller,
        });

      const txHash = await walletClient.writeContract(swapReq);
      const savedAmount  = savedAmountResult as bigint;
      const amountOut    = req.quote.amountOut;
      const receivedAmount = amountOut - savedAmount;

      return {
        txHash,
        savedAmount,
        receivedAmount,
        vaultAddress: vaultAddress as Address,
      };
    })(),
    (err) => {
      if (err instanceof Error && err.message === "calldata_unavailable") {
        return BlinErrors.rpc("Aggregator calldata unavailable for selected provider");
      }
      return BlinErrors.rpc("Swap execution failed", undefined, err);
    },
  );
}
