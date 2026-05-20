/**
 * Blin Finance — Testnet Deployment Script
 * ─────────────────────────────────────────
 * Compiles with Hardhat, deploys with ethers directly.
 *
 * Usage:
 *   1. npm run compile  (generates artifacts/)
 *   2. npx tsx scripts/deployTestnet.ts
 *      (reads DEPLOYER_PRIVATE_KEY + RPC_URL from .env.testnet)
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Load env
dotenv.config({ path: join(root, ".env.testnet") });

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL = process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const PK      = process.env.DEPLOYER_PRIVATE_KEY;
if (!PK) throw new Error("DEPLOYER_PRIVATE_KEY not set in .env.testnet");

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadArtifact(contractName: string) {
  // Hardhat stores artifacts at artifacts/src/<ContractName>.sol/<ContractName>.json
  const paths = [
    join(root, "artifacts", "src", `${contractName}.sol`, `${contractName}.json`),
    join(root, "artifacts", "src", "test", `${contractName}.sol`, `${contractName}.json`),
  ];
  for (const p of paths) {
    try {
      const raw = readFileSync(p, "utf8");
      const art = JSON.parse(raw);
      return { abi: art.abi as ethers.InterfaceAbi, bytecode: art.bytecode as string };
    } catch { /* try next */ }
  }
  throw new Error(`Artifact not found for ${contractName}. Run: npm run compile`);
}

async function deploy(
  factory: ethers.ContractFactory,
  label: string,
  ...args: unknown[]
): Promise<ethers.BaseContract> {
  process.stdout.write(`  Deploying ${label}... `);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`✓  ${addr}`);
  return contract;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PK, provider);
  const network  = await provider.getNetwork();
  const balance  = await provider.getBalance(wallet.address);

  console.log("\n═══════════════════════════════════════════════");
  console.log("  Blin Finance — Testnet Deployment");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Network:  chainId ${network.chainId}`);
  console.log(`  RPC:      ${RPC_URL}`);
  console.log(`  Deployer: ${wallet.address}`);
  console.log(`  Balance:  ${ethers.formatEther(balance)} ETH`);
  console.log("───────────────────────────────────────────────\n");

  if (balance === 0n) {
    throw new Error(
      "Deployer has 0 ETH.\n" +
      "Get testnet ETH from: https://faucet.arbitrum.io\n" +
      `Wallet address: ${wallet.address}`,
    );
  }

  // ── 1. MockERC20 ────────────────────────────────────────────────────────
  const mockErc20Art = loadArtifact("MockERC20");
  const MockERC20    = new ethers.ContractFactory(mockErc20Art.abi, mockErc20Art.bytecode, wallet);
  const mockUsdc     = await deploy(MockERC20, "MockERC20 (mUSDC, 6 dec)", "Mock USDC", "mUSDC", 6);
  const mockUsdcAddr = await mockUsdc.getAddress();

  // Seed deployer with 1,000,000 mUSDC
  process.stdout.write("  Seeding deployer with 1,000,000 mUSDC... ");
  const mintTx = await (mockUsdc as ethers.Contract).mint(wallet.address, ethers.parseUnits("1000000", 6));
  await mintTx.wait();
  console.log("✓");

  // ── 2. MockAavePool ──────────────────────────────────────────────────────
  const mockAaveArt = loadArtifact("MockAavePool");
  const MockAavePool = new ethers.ContractFactory(mockAaveArt.abi, mockAaveArt.bytecode, wallet);
  const mockAave     = await deploy(MockAavePool, "MockAavePool");
  const mockAaveAddr = await mockAave.getAddress();

  // ── 3. VaultFactory ─────────────────────────────────────────────────────
  const factoryArt = loadArtifact("VaultFactory");
  const VaultFactory = new ethers.ContractFactory(factoryArt.abi, factoryArt.bytecode, wallet);
  const factory      = await deploy(VaultFactory, "VaultFactory",
    mockUsdcAddr,
    mockAaveAddr,
    wallet.address,   // penaltyReceiver
    wallet.address,   // owner
  );
  const factoryAddr = await factory.getAddress();

  // ── 4. SaveSwap ──────────────────────────────────────────────────────────
  const swapArt = loadArtifact("SaveSwap");
  const SaveSwap  = new ethers.ContractFactory(swapArt.abi, swapArt.bytecode, wallet);
  const swap      = await deploy(SaveSwap, "SaveSwap", factoryAddr, wallet.address);
  const swapAddr  = await swap.getAddress();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Deployment Complete! 🎉");
  console.log("═══════════════════════════════════════════════");
  console.log(`  MockUSDC    : ${mockUsdcAddr}`);
  console.log(`  MockAavePool: ${mockAaveAddr}`);
  console.log(`  VaultFactory: ${factoryAddr}`);
  console.log(`  SaveSwap    : ${swapAddr}`);
  console.log("\n───────────────────────────────────────────────");
  console.log("  Paste into packages/shared/src/addresses.ts:");
  console.log(`  TESTNET_CONTRACT_ADDRESSES[${network.chainId}] = {`);
  console.log(`    saveSwap:     "${swapAddr}",`);
  console.log(`    vaultFactory: "${factoryAddr}",`);
  console.log(`    aavePool:     "${mockAaveAddr}",`);
  console.log(`    treasury:     "${wallet.address}",`);
  console.log("  }");
  console.log("───────────────────────────────────────────────");
  console.log("  Explorer: https://sepolia.arbiscan.io/address/" + factoryAddr);
  console.log("═══════════════════════════════════════════════\n");
}

main().catch((err: Error) => {
  console.error("\n✗ Deployment failed:", err.message ?? err);
  process.exitCode = 1;
});
