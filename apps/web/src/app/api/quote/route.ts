import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  decodeFunctionResult,
  type Address,
} from "viem";
import { mainnet, bsc, arbitrum, bscTestnet, arbitrumSepolia } from "viem/chains";

// ─── Native sentinel ──────────────────────────────────────────────────────────

const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

// ─── Viem chain clients (server-side) ─────────────────────────────────────────

function makeClient(chainId: number) {
  const KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "";
  switch (chainId) {
    case 1:
      return createPublicClient({
        chain: mainnet,
        transport: http(`https://eth-mainnet.g.alchemy.com/v2/${KEY}`),
      });
    case 56:
      return createPublicClient({
        chain: bsc,
        transport: http("https://bsc-dataseed.binance.org/"),
      });
    case 42161:
      return createPublicClient({
        chain: arbitrum,
        transport: http(`https://arb-mainnet.g.alchemy.com/v2/${KEY}`),
      });
    case 97:
      return createPublicClient({
        chain: bscTestnet,
        transport: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
      });
    case 421614:
      return createPublicClient({
        chain: arbitrumSepolia,
        transport: http(`https://arb-sepolia.g.alchemy.com/v2/${KEY}`),
      });
    default:
      return null;
  }
}

// ─── Router / quoter addresses ────────────────────────────────────────────────

/** Wrapped native token (WETH / WBNB) per chain — used for multi-hop paths. */
const WRAPPED_NATIVE: Record<number, Address> = {
  1:      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  56:     "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  42161:  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH on Arb
  97:     "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", // WBNB testnet
  421614: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73", // WETH on Arb Sepolia
};

/** PancakeSwap V2 Router02 — BSC mainnet + testnet. */
const PANCAKE_V2_ROUTER: Partial<Record<number, Address>> = {
  56: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  97: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
};

/** Uniswap V3 QuoterV2 — same address on mainnet and Arbitrum. */
const UNISWAP_V3_QUOTER: Partial<Record<number, Address>> = {
  1:     "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  42161: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
};

/** Mock router on Arb Sepolia testnet (V2-compatible interface). */
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
      { name: "path",     type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

// QuoterV2 is "nonpayable" (not view), so we call it via client.call() to
// avoid viem's type-level restriction on readContract for non-view functions.
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

// ─── PancakeSwap V2 quote ─────────────────────────────────────────────────────

async function quotePancakeV2(
  client:        ReturnType<typeof createPublicClient>,
  routerAddress: Address,
  tokenIn:       Address,
  tokenOut:      Address,
  amountIn:      bigint,
  wNative:       Address,
): Promise<bigint | null> {
  const tIn  = tokenIn.toLowerCase()  === NATIVE.toLowerCase() ? wNative : tokenIn;
  const tOut = tokenOut.toLowerCase() === NATIVE.toLowerCase() ? wNative : tokenOut;
  if (tIn.toLowerCase() === tOut.toLowerCase()) return null;

  // Try direct pair first; fall back to routing through wrapped native.
  const paths: Address[][] = [[tIn, tOut]];
  if (tIn.toLowerCase() !== wNative.toLowerCase() && tOut.toLowerCase() !== wNative.toLowerCase()) {
    paths.push([tIn, wNative, tOut]);
  }

  for (const path of paths) {
    try {
      const amounts = await client.readContract({
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

// ─── Uniswap V3 quote ─────────────────────────────────────────────────────────

const V3_FEE_TIERS = [100, 500, 3_000, 10_000] as const;

async function quoteUniswapV3(
  client:        ReturnType<typeof createPublicClient>,
  quoterAddress: Address,
  tokenIn:       Address,
  tokenOut:      Address,
  amountIn:      bigint,
  wNative:       Address,
): Promise<{ amountOut: bigint; fee: number } | null> {
  const tIn  = tokenIn.toLowerCase()  === NATIVE.toLowerCase() ? wNative : tokenIn;
  const tOut = tokenOut.toLowerCase() === NATIVE.toLowerCase() ? wNative : tokenOut;
  if (tIn.toLowerCase() === tOut.toLowerCase()) return null;

  let best: { amountOut: bigint; fee: number } | null = null;

  // Try each fee tier in parallel and pick the best amountOut.
  const results = await Promise.allSettled(
    V3_FEE_TIERS.map(async (fee) => {
      const callData = encodeFunctionData({
        abi:          UNISWAP_V3_QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args: [{
          tokenIn: tIn, tokenOut: tOut, amountIn,
          fee, sqrtPriceLimitX96: 0n,
        }],
      });

      const { data } = await client.call({ to: quoterAddress, data: callData });
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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp          = req.nextUrl.searchParams;
  const chainId     = parseInt(sp.get("chainId")    ?? "0", 10);
  const tokenIn     = sp.get("tokenIn")    ?? "";
  const tokenOut    = sp.get("tokenOut")   ?? "";
  const amountInStr = sp.get("amountIn")   ?? "0";
  const slippageBps = parseInt(sp.get("slippageBps") ?? "50", 10);

  if (
    !chainId ||
    !/^0x[0-9a-fA-F]{40}$/i.test(tokenIn) ||
    !/^0x[0-9a-fA-F]{40}$/i.test(tokenOut) ||
    amountInStr === "0" ||
    amountInStr === ""
  ) {
    return NextResponse.json({ error: "Missing or invalid params" }, { status: 400 });
  }

  const viemClient = makeClient(chainId);
  const wNative    = WRAPPED_NATIVE[chainId];
  if (!viemClient || !wNative) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  let amountIn: bigint;
  try {
    amountIn = BigInt(amountInStr);
  } catch {
    return NextResponse.json({ error: "Invalid amountIn" }, { status: 400 });
  }

  try {
    let amountOut: bigint | null = null;
    let provider = "unknown";
    let fee: number | undefined;

    const pancakeAddr = PANCAKE_V2_ROUTER[chainId] ?? MOCK_ROUTER[chainId];
    const uniswapAddr = UNISWAP_V3_QUOTER[chainId];

    if (pancakeAddr) {
      amountOut = await quotePancakeV2(
        viemClient, pancakeAddr,
        tokenIn as Address, tokenOut as Address,
        amountIn, wNative,
      );
      provider = chainId === 97 || chainId === 421614 ? "mock" : "pancakeswap-v2";
    } else if (uniswapAddr) {
      const result = await quoteUniswapV3(
        viemClient, uniswapAddr,
        tokenIn as Address, tokenOut as Address,
        amountIn, wNative,
      );
      if (result) { amountOut = result.amountOut; fee = result.fee; }
      provider = "uniswap-v3";
    }

    if (!amountOut || amountOut === 0n) {
      return NextResponse.json(
        { error: "No liquidity found for this pair" },
        { status: 404 },
      );
    }

    const slip        = BigInt(slippageBps);
    const amountOutMin = amountOut - (amountOut * slip) / 10_000n;

    return NextResponse.json(
      { amountOut: amountOut.toString(), amountOutMin: amountOutMin.toString(), provider, fee },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[/api/quote]", err);
    return NextResponse.json({ error: "Quote failed" }, { status: 500 });
  }
}
