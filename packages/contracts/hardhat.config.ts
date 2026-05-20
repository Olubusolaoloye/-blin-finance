import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";

// Load .env.testnet if it exists, fall back to .env
dotenv.config({ path: ".env.testnet" });
if (!process.env.RPC_URL) dotenv.config();

const pk = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = pk ? [pk.startsWith("0x") ? pk : `0x${pk}`] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },

  networks: {
    arbSepolia: {
      type:     "http",
      url:      process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc",
      chainId:  421614,
      accounts,
    },
    bscTestnet: {
      type:     "http",
      url:      process.env.RPC_URL ?? "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId:  97,
      accounts,
    },
    localhost: {
      type: "http",
      url:  "http://127.0.0.1:8545",
    },
  },

  // ── Etherscan / Arbiscan verification ─────────────────────────────────────
  etherscan: {
    apiKey: {
      // Arbitrum Sepolia uses the same Arbiscan API key as Arbitrum One.
      // Get a free key at: https://arbiscan.io/myapikey
      arbitrumSepolia: process.env.ARBISCAN_API_KEY ?? "",
    },
    customChains: [
      {
        network:   "arbitrumSepolia",
        chainId:   421614,
        urls: {
          apiURL:     "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
    ],
  },

  paths: {
    sources:   "./src",
    tests:     "./test-hardhat",   // Foundry tests live in ./test — don't touch them
    cache:     "./cache-hardhat",
    artifacts: "./artifacts",
  },
};

export default config;
