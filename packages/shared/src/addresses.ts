import type { SupportedChainId, TestnetChainId } from "./chains.js";

export type ContractAddresses = {
  saveSwap: `0x${string}`;
  vaultFactory: `0x${string}`;
  /** Aave V3 Pool Proxy (or MockAavePool on testnet) */
  aavePool: `0x${string}`;
  /** Treasury / penalty receiver */
  treasury: `0x${string}`;
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/**
 * Deployed contract addresses per chain.
 * Populated by the deploy script (script/Deploy.s.sol or DeployTestnet.s.sol).
 * Zero addresses = not yet deployed on that chain.
 */
export const CONTRACT_ADDRESSES: Record<SupportedChainId, ContractAddresses> = {
  // BSC Mainnet — deployed after Phase D
  56: {
    saveSwap:     ZERO,
    vaultFactory: ZERO,
    aavePool:     "0x6807dc923806fE8Fd134338EABCA509979a7e07",
    treasury:     ZERO,
  },
  // Ethereum Mainnet
  1: {
    saveSwap:     ZERO,
    vaultFactory: ZERO,
    aavePool:     "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    treasury:     ZERO,
  },
  // Arbitrum One
  42161: {
    saveSwap:     ZERO,
    vaultFactory: ZERO,
    aavePool:     "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    treasury:     ZERO,
  },
};

/**
 * Testnet addresses — fill these in after running DeployTestnet.s.sol.
 *
 * Example (Arbitrum Sepolia):
 *   forge script script/DeployTestnet.s.sol --rpc-url arb-sepolia --broadcast
 *   → copy printed VaultFactory and SaveSwap addresses here
 */
export const TESTNET_CONTRACT_ADDRESSES: Record<TestnetChainId, ContractAddresses> = {
  // Arbitrum Sepolia (421614) — redeployed 2026-05-21 (push-model fix)
  // AutoSaveVault now pushes tokens to strategy via safeTransfer() before deposit().
  // AaveV3Strategy.deposit() no longer needs transferFrom — tokens arrive via push.
  421614: {
    saveSwap:     "0xde6B9F78097d6e5123cB51eEC03550Dc40E9ae2c",
    vaultFactory: "0x073bb6923Bd4347F090E84438B155E6Dd04723C9",
    aavePool:     "0xc9c2452bBc1004f31FA5fE9cE1e558e18AdFa3AB",
    treasury:     "0xA7d617117887b3cAf2C93B07ceD3081Ee9F8F63a",
  },
  // BSC Testnet (97) — fill after running DeployTestnet.s.sol on BSC testnet
  97: {
    saveSwap:     ZERO,
    vaultFactory: ZERO,
    aavePool:     ZERO,
    treasury:     ZERO,
  },
};
