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
  // Arbitrum Sepolia (421614) — deployed 2026-05-20
  421614: {
    saveSwap:     "0x56747F5e1487d9E61559Aee1Dc87627484CCc55A",
    vaultFactory: "0xd0866AEf7Ff089d6316EEF4c37fa789fe7ab4162",
    aavePool:     "0x733F68A78aDDC0AB813b66867E4BeF29D5C83d4e",
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
