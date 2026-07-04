import type { SupportedChainId, TestnetChainId } from "./chains.js";

// ─── BSC chain addresses (locking & swapping) ────────────────────────────────

export type BscContractAddresses = {
  /** AutoSaveVault factory — deploys per-user vaults on demand. */
  vaultFactory:  `0x${string}`;
  /** SaveSwap — entry point for swap-and-save. */
  saveSwap:      `0x${string}`;
  /** USDC on BSC (6 decimals). */
  usdc:          `0x${string}`;
  /** WBNB — used in PancakeSwap swap paths. */
  wbnb:          `0x${string}`;
  /** PancakeSwap V2 Router02. */
  pancakeRouter: `0x${string}`;
  /** Treasury receives early-exit USDC penalties. */
  treasury:      `0x${string}`;
};

// ─── Ethereum chain addresses (BLIN yield claiming) ──────────────────────────

export type EthContractAddresses = {
  /** BlinYieldDistributor — users call claim() here with a signed voucher. */
  blinYieldDistributor: `0x${string}`;
  /**
   * $BLIN token on Ethereum.
   * Live contract: 0xaEFB54306240502c5421Be478fa16aACfA9698A2
   */
  blinToken:            `0x${string}`;
};

// ─── Combined type used by the SDK ───────────────────────────────────────────

export type ContractAddresses = BscContractAddresses & {
  /** Ethereum addresses relevant to this chain entry (BSC chains carry ETH refs). */
  eth: EthContractAddresses;
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/// Live $BLIN token on Ethereum Mainnet.
export const BLIN_TOKEN_ADDRESS = "0xaEFB54306240502c5421Be478fa16aACfA9698A2" as const;

/**
 * Deployed contract addresses per chain.
 * BSC (56) is the primary chain. Ethereum (1) hosts BlinYieldDistributor.
 * Zero addresses = not yet deployed.
 */
export const CONTRACT_ADDRESSES: Record<SupportedChainId, ContractAddresses> = {
  // ── BSC Mainnet ───────────────────────────────────────────────────────────
  56: {
    vaultFactory:  ZERO,  // fill after: forge script Deploy.s.sol --rpc-url bsc
    saveSwap:      ZERO,
    usdc:          "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    wbnb:          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    treasury:      ZERO,
    eth: {
      blinYieldDistributor: ZERO, // fill after: forge script DeployDistributor.s.sol --rpc-url ethereum
      blinToken:            BLIN_TOKEN_ADDRESS,
    },
  },
  // ── Ethereum Mainnet (referenced by BSC users for yield claiming) ─────────
  1: {
    vaultFactory:  ZERO,
    saveSwap:      ZERO,
    usdc:          "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    wbnb:          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    pancakeRouter: ZERO,
    treasury:      ZERO,
    eth: {
      blinYieldDistributor: ZERO,
      blinToken:            BLIN_TOKEN_ADDRESS,
    },
  },
  // ── Arbitrum One (future) ─────────────────────────────────────────────────
  42161: {
    vaultFactory:  ZERO,
    saveSwap:      ZERO,
    usdc:          "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    wbnb:          "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    pancakeRouter: ZERO,
    treasury:      ZERO,
    eth: {
      blinYieldDistributor: ZERO,
      blinToken:            BLIN_TOKEN_ADDRESS,
    },
  },
};

export const TESTNET_CONTRACT_ADDRESSES: Record<TestnetChainId, ContractAddresses> = {
  97: {
    // Predicted addresses from forge dry-run (deployer nonce=0).
    // Confirmed & broadcast: run DeployTestnet.s.sol --broadcast to make live.
    vaultFactory:  "0x733F68A78aDDC0AB813b66867E4BeF29D5C83d4e",
    saveSwap:      "0xd0866AEf7Ff089d6316EEF4c37fa789fe7ab4162",
    usdc:          "0xbA64B04909B38EeA5601E719bB71cC11cc26126B", // MockUSDC (mUSDC)
    wbnb:          "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    pancakeRouter: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    treasury:      "0xA7d617117887b3cAf2C93B07ceD3081Ee9F8F63a",
    eth: {
      // Deployed via DeployEthSepolia.s.sol on Ethereum Sepolia (chainId 11155111).
      blinYieldDistributor: "0x5cA8F34F0Cb604d62A4f2F07230AAFb93526C34D",
      blinToken:            "0xbA64B04909B38EeA5601E719bB71cC11cc26126B", // MockBLIN (mBLIN)
    },
  },
  421614: {
    // Deployed via DeployArbSepolia.s.sol — uses MockRouter (no real DEX on Arb Sepolia).
    vaultFactory:  "0xc660cE2E3a7B00Cca4B18EaE82e5CA57B3c20E50",
    saveSwap:      "0x6070dD54b2E6135c4DB45548CF212CafD42221C3",
    usdc:          "0x8B919dA41B4296a796de3722519490CA6B2A788B", // MockUSDC (mUSDC)
    wbnb:          "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73", // WETH on Arb Sepolia
    pancakeRouter: "0xC8c8c44Aa3b4107f90Cd893E4c142D349f50782d", // MockRouter
    treasury:      "0xA7d617117887b3cAf2C93B07ceD3081Ee9F8F63a",
    eth: {
      // Deployed via DeployEthSepolia.s.sol on Ethereum Sepolia (chainId 11155111).
      blinYieldDistributor: "0x5cA8F34F0Cb604d62A4f2F07230AAFb93526C34D",
      blinToken:            "0xbA64B04909B38EeA5601E719bB71cC11cc26126B", // MockBLIN (mBLIN)
    },
  },
};
