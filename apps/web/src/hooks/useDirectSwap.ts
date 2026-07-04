"use client";

import { useState, useCallback } from "react";
import { useChainId, usePublicClient, useWalletClient } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { type Address, type Hash, type WalletClient, encodeFunctionData, parseAbi } from "viem";
import { CONTRACT_ADDRESSES, TESTNET_CONTRACT_ADDRESSES } from "@blin/shared";
import { AUTO_SAVE_VAULT_ABI, VAULT_FACTORY_ABI as _VF_ABI, ERC20_ABI } from "@blin/sdk";
import type { QuoteResult } from "@blin/sdk";
import type { Token } from "@/lib/tokens";
import { NATIVE_ADDRESS } from "@/lib/tokens";

// ─── Constants ────────────────────────────────────────────────────────────────

const WRAPPED_NATIVE: Record<number, Address> = {
  1:      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  56:     "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  42161:  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH on Arb
  97:     "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
  421614: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
};

// PancakeSwap V2 Router02 addresses
const PANCAKE_V2_ROUTER: Record<number, Address> = {
  56: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  97: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
};

// Uniswap V3 SwapRouter02 addresses (same on ETH + Arb)
const UNISWAP_V3_ROUTER: Record<number, Address> = {
  1:      "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  42161:  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  421614: "0xC8c8c44Aa3b4107f90Cd893E4c142D349f50782d", // mock on Arb Sepolia
};

// USDC addresses per chain
const USDC_ADDRESS: Record<number, Address> = {
  1:      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  56:     "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  42161:  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  97:     "0xbA64B04909B38EeA5601E719bB71cC11cc26126B", // MockUSDC
  421614: "0x8B919dA41B4296a796de3722519490CA6B2A788B", // MockUSDC
};

// ─── ABIs ────────────────────────────────────────────────────────────────────

const PANCAKE_V2_ABI = parseAbi([
  "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)",
  "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
]);

const UNISWAP_V3_ABI = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum) params) payable returns (uint256 amountOut)",
  "function multicall(bytes[] data) payable returns (bytes[] results)",
  "function unwrapWETH9(uint256 amountMinimum, address recipient)",
]);

// Use the exported ABI from SDK (already has getVault + getOrCreateVault)
const VAULT_FACTORY_ABI = _VF_ABI;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DirectSwapParams {
  fromToken:    Token;
  toToken:      Token;
  amountIn:     bigint;
  quote:        QuoteResult;
  saveBps:      number;        // 0 = no autosave
  lockDuration: bigint;        // seconds
}

export interface DirectSwapResult {
  mainTxHash:  Hash;
  saveTxHash?: Hash;
  lockId?:     bigint;
  savedUsdc?:  bigint;
  vaultAddress?: Address;
}

export type SwapStep =
  | "idle"
  | "approving"
  | "swapping"
  | "saving"
  | "approving-vault"
  | "locking"
  | "done";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Encode a Uniswap V3 multi-hop path: token0, fee0, token1, fee1, token2, ... */
function encodeV3Path(tokens: Address[], fees: number[]): `0x${string}` {
  let hex = tokens[0]!.toLowerCase().slice(2);
  for (let i = 0; i < fees.length; i++) {
    hex += fees[i]!.toString(16).padStart(6, "0");
    hex += tokens[i + 1]!.toLowerCase().slice(2);
  }
  return `0x${hex}`;
}

function isNative(addr: string): boolean {
  return addr.toLowerCase() === NATIVE_ADDRESS.toLowerCase();
}

function getChainAddresses(chainId: number) {
  if (chainId in TESTNET_CONTRACT_ADDRESSES)
    return TESTNET_CONTRACT_ADDRESSES[chainId as keyof typeof TESTNET_CONTRACT_ADDRESSES];
  if (chainId in CONTRACT_ADDRESSES)
    return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return CONTRACT_ADDRESSES[56];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDirectSwap() {
  const chainId      = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { user } = usePrivy();

  const [step, setStep] = useState<SwapStep>("idle");

  const executeDirectSwap = useCallback(
    async (params: DirectSwapParams): Promise<DirectSwapResult> => {
      const { fromToken, toToken, amountIn, quote, saveBps, lockDuration } = params;

      if (!walletClient?.account || !publicClient) {
        throw new Error("Wallet not connected");
      }

      const userAddress = walletClient.account.address;
      const deadline    = BigInt(Math.floor(Date.now() / 1000) + 600); // 10 min
      const wNative     = WRAPPED_NATIVE[chainId];
      const usdcAddr    = USDC_ADDRESS[chainId];
      const chainAddrs  = getChainAddresses(chainId);

      if (!wNative || !usdcAddr) throw new Error(`Chain ${chainId} not supported`);

      // ── Determine DEX type ─────────────────────────────────────────────────
      const isPancake   = chainId in PANCAKE_V2_ROUTER;
      const isUniswapV3 = chainId in UNISWAP_V3_ROUTER && !isPancake;
      const routerAddr  = (isPancake ? PANCAKE_V2_ROUTER[chainId] : UNISWAP_V3_ROUTER[chainId])!;

      const isNativeIn  = isNative(fromToken.address);
      const isNativeOut = isNative(toToken.address);

      // ── Split amountIn: save portion is taken from amountIn proportionally ─
      // e.g. saveBps=1000 → save 10% of tokenIn, swap remaining 90% normally
      const saveBigInt      = BigInt(saveBps);
      const saveAmountIn    = saveBps > 0 ? (amountIn * saveBigInt) / 10_000n : 0n;
      const mainAmountIn    = amountIn - saveAmountIn;

      // Proportional amountOutMin for main swap
      const mainAmountOutMin = saveBps > 0
        ? (quote.amountOutMin * (10_000n - saveBigInt)) / 10_000n
        : quote.amountOutMin;

      // ── 1. Approve router for full amountIn (ERC-20 only) ─────────────────
      if (!isNativeIn) {
        const allowance = await publicClient.readContract({
          address:      fromToken.address as Address,
          abi:          ERC20_ABI,
          functionName: "allowance",
          args:         [userAddress, routerAddr],
        }) as bigint;

        if (allowance < amountIn) {
          setStep("approving");
          const { request } = await publicClient.simulateContract({
            address:      fromToken.address as Address,
            abi:          ERC20_ABI,
            functionName: "approve",
            args:         [routerAddr, amountIn],
            account:      userAddress,
          });
          const approveHash = await walletClient.writeContract(request);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      // ── 2. Execute main swap ───────────────────────────────────────────────
      setStep("swapping");
      let mainTxHash: Hash;

      if (isPancake) {
        mainTxHash = await _pancakeSwap({
          publicClient, walletClient, routerAddr,
          amountIn: mainAmountIn, amountOutMin: mainAmountOutMin,
          fromToken, toToken, wNative, userAddress, deadline,
          isNativeIn, isNativeOut,
        });
      } else {
        mainTxHash = await _uniswapV3Swap({
          publicClient, walletClient, routerAddr,
          amountIn: mainAmountIn, amountOutMin: mainAmountOutMin,
          fromToken, toToken, wNative, userAddress, deadline,
          fee: quote.fee ?? 3_000,
          isNativeIn, isNativeOut,
        });
      }

      await publicClient.waitForTransactionReceipt({ hash: mainTxHash });

      // ── 3. AutoSave: swap save portion → USDC ──────────────────────────────
      if (saveAmountIn === 0n) {
        setStep("done");
        return { mainTxHash };
      }

      setStep("saving");

      // If tokenIn is already USDC, skip the swap
      const tokenInIsUsdc = fromToken.address.toLowerCase() === usdcAddr.toLowerCase();
      let savedUsdc        = tokenInIsUsdc ? saveAmountIn : 0n;
      let saveTxHash: Hash | undefined;

      if (!tokenInIsUsdc) {
        // Swap saveAmountIn tokenIn → USDC → user's wallet
        if (isPancake) {
          saveTxHash = await _pancakeSaveSwap({
            publicClient, walletClient, routerAddr,
            saveAmountIn, fromToken, usdcAddr, wNative,
            userAddress, deadline, isNativeIn,
          });
        } else {
          saveTxHash = await _uniswapV3SaveSwap({
            publicClient, walletClient, routerAddr,
            saveAmountIn, fromToken, usdcAddr, wNative,
            userAddress, deadline,
            fee: quote.fee ?? 3_000, isNativeIn,
          });
        }

        const receipt = await publicClient.waitForTransactionReceipt({ hash: saveTxHash });
        // Estimate saved USDC from receipt (we don't parse events for simplicity)
        // Use the rough estimate: saveAmountIn * quote.amountOut / mainAmountIn (but cap)
        const ratio = mainAmountIn > 0n
          ? (saveAmountIn * quote.amountOut) / mainAmountIn
          : 0n;
        savedUsdc = ratio;
        void receipt;
      }

      // ── 4. If vault factory deployed, create lock ──────────────────────────
      const factoryAddr = (chainAddrs as { vaultFactory?: Address }).vaultFactory
        ?? "0x0000000000000000000000000000000000000000" as Address;

      const ZERO = "0x0000000000000000000000000000000000000000" as Address;
      let lockId: bigint | undefined;
      let vaultAddress: Address | undefined;

      if (factoryAddr !== ZERO && savedUsdc > 0n) {
        try {
          // Get or create the user's vault
          setStep("saving");
          const { request: createReq } = await publicClient.simulateContract({
            address:      factoryAddr,
            abi:          VAULT_FACTORY_ABI,
            functionName: "getOrCreateVault",
            args:         [userAddress],
            account:      userAddress,
          });
          const vaultCreationTx = await walletClient.writeContract(createReq);
          await publicClient.waitForTransactionReceipt({ hash: vaultCreationTx });

          vaultAddress = await publicClient.readContract({
            address:      factoryAddr,
            abi:          VAULT_FACTORY_ABI,
            functionName: "getVault",
            args:         [userAddress],
          }) as Address;

          if (vaultAddress && vaultAddress !== ZERO) {
            // Approve vault to spend USDC
            setStep("approving-vault");
            const usdcAllowance = await publicClient.readContract({
              address:      usdcAddr,
              abi:          ERC20_ABI,
              functionName: "allowance",
              args:         [userAddress, vaultAddress],
            }) as bigint;

            if (usdcAllowance < savedUsdc) {
              const { request: approveVaultReq } = await publicClient.simulateContract({
                address:      usdcAddr,
                abi:          ERC20_ABI,
                functionName: "approve",
                args:         [vaultAddress, savedUsdc],
                account:      userAddress,
              });
              const approveVaultTx = await walletClient.writeContract(approveVaultReq);
              await publicClient.waitForTransactionReceipt({ hash: approveVaultTx });
            }

            // Create the lock
            setStep("locking");
            const lockName = "0x4175746f5361766500000000000000000000000000000000000000000000000000" as `0x${string}`; // "AutoSave"
            const { request: lockReq } = await publicClient.simulateContract({
              address:      vaultAddress,
              abi:          AUTO_SAVE_VAULT_ABI,
              functionName: "createLock",
              args:         [savedUsdc, lockDuration, lockName as `0x${string}`],
              account:      userAddress,
            });
            const lockTx   = await walletClient.writeContract(lockReq);
            const lockReceipt = await publicClient.waitForTransactionReceipt({ hash: lockTx });
            void lockReceipt;
            lockId = 0n; // we don't parse the event for lockId here
          }
        } catch (vaultErr) {
          // Non-fatal: USDC is already in user's wallet; vault step just failed
          console.warn("[useDirectSwap] Vault lock failed (non-fatal):", vaultErr);
        }
      }

      setStep("done");
      return {
        mainTxHash,
        ...(saveTxHash   !== undefined ? { saveTxHash }   : {}),
        ...(lockId       !== undefined ? { lockId }       : {}),
        ...(savedUsdc    !== undefined ? { savedUsdc }    : {}),
        ...(vaultAddress !== undefined ? { vaultAddress } : {}),
      };
    },
    [chainId, publicClient, walletClient, user],
  );

  return { executeDirectSwap, step, isExecuting: step !== "idle" && step !== "done" };
}

// ─── PancakeSwap V2 helpers ───────────────────────────────────────────────────

interface PancakeSwapArgs {
  publicClient:  ReturnType<typeof usePublicClient>;
  walletClient:  WalletClient;
  routerAddr:    Address;
  amountIn:      bigint;
  amountOutMin:  bigint;
  fromToken:     Token;
  toToken:       Token;
  wNative:       Address;
  userAddress:   Address;
  deadline:      bigint;
  isNativeIn:    boolean;
  isNativeOut:   boolean;
}

async function _pancakeSwap({
  publicClient, walletClient, routerAddr,
  amountIn, amountOutMin, fromToken, toToken,
  wNative, userAddress, deadline, isNativeIn, isNativeOut,
}: PancakeSwapArgs): Promise<Hash> {
  const tIn  = isNativeIn  ? wNative : fromToken.address as Address;
  const tOut = isNativeOut ? wNative : toToken.address   as Address;
  const path = tIn.toLowerCase() === tOut.toLowerCase() ? [tIn] : [tIn, tOut];

  if (isNativeIn) {
    const { request } = await publicClient!.simulateContract({
      address:      routerAddr,
      abi:          PANCAKE_V2_ABI,
      functionName: "swapExactETHForTokens",
      args:         [amountOutMin, path, userAddress, deadline],
      account:      userAddress,
      value:        amountIn,
    });
    return walletClient.writeContract(request);
  }

  if (isNativeOut) {
    const { request } = await publicClient!.simulateContract({
      address:      routerAddr,
      abi:          PANCAKE_V2_ABI,
      functionName: "swapExactTokensForETH",
      args:         [amountIn, amountOutMin, path, userAddress, deadline],
      account:      userAddress,
    });
    return walletClient.writeContract(request);
  }

  const { request } = await publicClient!.simulateContract({
    address:      routerAddr,
    abi:          PANCAKE_V2_ABI,
    functionName: "swapExactTokensForTokens",
    args:         [amountIn, amountOutMin, path, userAddress, deadline],
    account:      userAddress,
  });
  return walletClient.writeContract(request);
}

interface PancakeSaveArgs {
  publicClient: ReturnType<typeof usePublicClient>;
  walletClient: WalletClient;
  routerAddr:   Address;
  saveAmountIn: bigint;
  fromToken:    Token;
  usdcAddr:     Address;
  wNative:      Address;
  userAddress:  Address;
  deadline:     bigint;
  isNativeIn:   boolean;
}

async function _pancakeSaveSwap({
  publicClient, walletClient, routerAddr,
  saveAmountIn, fromToken, usdcAddr, wNative,
  userAddress, deadline, isNativeIn,
}: PancakeSaveArgs): Promise<Hash> {
  const tIn = isNativeIn ? wNative : fromToken.address as Address;

  // Build path: tokenIn → WBNB → USDC (always routes via WBNB for reliability)
  const isAlreadyUsdc = tIn.toLowerCase() === usdcAddr.toLowerCase();
  if (isAlreadyUsdc) throw new Error("tokenIn is USDC — should not call save swap");

  const path: Address[] = tIn.toLowerCase() === wNative.toLowerCase()
    ? [wNative, usdcAddr]           // WBNB → USDC direct
    : [tIn, wNative, usdcAddr];     // token → WBNB → USDC

  if (isNativeIn) {
    const { request } = await publicClient!.simulateContract({
      address:      routerAddr,
      abi:          PANCAKE_V2_ABI,
      functionName: "swapExactETHForTokens",
      args:         [0n, path, userAddress, deadline],
      account:      userAddress,
      value:        saveAmountIn,
    });
    return walletClient.writeContract(request);
  }

  const { request } = await publicClient!.simulateContract({
    address:      routerAddr,
    abi:          PANCAKE_V2_ABI,
    functionName: "swapExactTokensForTokens",
    args:         [saveAmountIn, 0n, path, userAddress, deadline],
    account:      userAddress,
  });
  return walletClient.writeContract(request);
}

// ─── Uniswap V3 helpers ───────────────────────────────────────────────────────

interface UniswapV3SwapArgs {
  publicClient:  ReturnType<typeof usePublicClient>;
  walletClient:  WalletClient;
  routerAddr:    Address;
  amountIn:      bigint;
  amountOutMin:  bigint;
  fromToken:     Token;
  toToken:       Token;
  wNative:       Address;
  userAddress:   Address;
  deadline:      bigint;
  fee:           number;
  isNativeIn:    boolean;
  isNativeOut:   boolean;
}

async function _uniswapV3Swap({
  publicClient, walletClient, routerAddr,
  amountIn, amountOutMin, fromToken, toToken,
  wNative, userAddress, deadline, fee, isNativeIn, isNativeOut,
}: UniswapV3SwapArgs): Promise<Hash> {
  const tIn  = isNativeIn  ? wNative : fromToken.address as Address;
  const tOut = isNativeOut ? wNative : toToken.address   as Address;

  if (isNativeOut) {
    // Swap to WETH first, then unwrap — done via multicall
    const exactInputCalldata = encodeFunctionData({
      abi:          UNISWAP_V3_ABI,
      functionName: "exactInputSingle",
      args:         [{ tokenIn: tIn, tokenOut: tOut, fee, recipient: routerAddr, amountIn, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
    });
    const unwrapCalldata = encodeFunctionData({
      abi:          UNISWAP_V3_ABI,
      functionName: "unwrapWETH9",
      args:         [amountOutMin, userAddress],
    });
    const { request } = await publicClient!.simulateContract({
      address:      routerAddr,
      abi:          UNISWAP_V3_ABI,
      functionName: "multicall",
      args:         [[exactInputCalldata, unwrapCalldata]],
      account:      userAddress,
      value:        isNativeIn ? amountIn : 0n,
    });
    return walletClient.writeContract(request);
  }

  const { request } = await publicClient!.simulateContract({
    address:      routerAddr,
    abi:          UNISWAP_V3_ABI,
    functionName: "exactInputSingle",
    args:         [{ tokenIn: tIn, tokenOut: tOut, fee, recipient: userAddress, amountIn, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
    account:      userAddress,
    value:        isNativeIn ? amountIn : 0n,
  });
  return walletClient.writeContract(request);
}

interface UniswapV3SaveArgs {
  publicClient: ReturnType<typeof usePublicClient>;
  walletClient: WalletClient;
  routerAddr:   Address;
  saveAmountIn: bigint;
  fromToken:    Token;
  usdcAddr:     Address;
  wNative:      Address;
  userAddress:  Address;
  deadline:     bigint;
  fee:          number;
  isNativeIn:   boolean;
}

async function _uniswapV3SaveSwap({
  publicClient, walletClient, routerAddr,
  saveAmountIn, fromToken, usdcAddr, wNative,
  userAddress, deadline, fee, isNativeIn,
}: UniswapV3SaveArgs): Promise<Hash> {
  const tIn = isNativeIn ? wNative : fromToken.address as Address;

  // If tokenIn is WETH: direct WETH → USDC (0.05% pool = fee 500)
  if (tIn.toLowerCase() === wNative.toLowerCase()) {
    const { request } = await publicClient!.simulateContract({
      address:      routerAddr,
      abi:          UNISWAP_V3_ABI,
      functionName: "exactInputSingle",
      args:         [{ tokenIn: tIn, tokenOut: usdcAddr, fee: 500, recipient: userAddress, amountIn: saveAmountIn, amountOutMinimum: 0n, sqrtPriceLimitX96: 0n }],
      account:      userAddress,
      value:        isNativeIn ? saveAmountIn : 0n,
    });
    return walletClient.writeContract(request);
  }

  // Otherwise: tokenIn → WETH (using same fee tier as main swap) → USDC (500)
  const multihopPath = encodeV3Path([tIn, wNative, usdcAddr], [fee, 500]);
  const { request } = await publicClient!.simulateContract({
    address:      routerAddr,
    abi:          UNISWAP_V3_ABI,
    functionName: "exactInput",
    args:         [{ path: multihopPath, recipient: userAddress, amountIn: saveAmountIn, amountOutMinimum: 0n }],
    account:      userAddress,
    value:        isNativeIn ? saveAmountIn : 0n,
  });
  return walletClient.writeContract(request);
}
