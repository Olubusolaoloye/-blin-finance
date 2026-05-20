/**
 * Blin Finance — Testnet Contract Verification
 * ──────────────────────────────────────────────
 * Run via:  npm run verify:arb-sepolia
 *    which: hardhat run scripts/verifyTestnet.ts --network arbSepolia
 *
 * Prerequisites:
 *   1. npm install --save-dev @nomicfoundation/hardhat-verify
 *   2. Add  ARBISCAN_API_KEY=<key>  to .env.testnet
 *      Free key: https://arbiscan.io/myapikey  (sign up → API Keys → Add)
 *   3. npm run compile
 */

import hre from "hardhat";

// ── Deployed addresses (Arbitrum Sepolia, chainId 421614) ─────────────────────

const DEPLOYER    = "0xA7d617117887b3cAf2C93B07ceD3081Ee9F8F63a";
const MOCK_USDC   = "0xbA64B04909B38EeA5601E719bB71cC11cc26126B";
const MOCK_AAVE   = "0x733F68A78aDDC0AB813b66867E4BeF29D5C83d4e";
const VAULT_FACTORY = "0xd0866AEf7Ff089d6316EEF4c37fa789fe7ab4162";
const SAVE_SWAP   = "0x56747F5e1487d9E61559Aee1Dc87627484CCc55A";

const CONTRACTS = [
  {
    name:     "MockERC20 (mUSDC)",
    address:  MOCK_USDC,
    contract: "src/test/MockERC20.sol:MockERC20",
    // constructor(string name_, string symbol_, uint8 decimals_)
    constructorArguments: ["Mock USDC", "mUSDC", 6],
  },
  {
    name:     "MockAavePool",
    address:  MOCK_AAVE,
    contract: "src/test/MockAavePool.sol:MockAavePool",
    // no constructor args
    constructorArguments: [],
  },
  {
    name:     "VaultFactory",
    address:  VAULT_FACTORY,
    contract: "src/VaultFactory.sol:VaultFactory",
    // constructor(address asset_, address aavePool_, address penaltyReceiver_, address owner_)
    constructorArguments: [MOCK_USDC, MOCK_AAVE, DEPLOYER, DEPLOYER],
  },
  {
    name:     "SaveSwap",
    address:  SAVE_SWAP,
    contract: "src/SaveSwap.sol:SaveSwap",
    // constructor(address vaultFactory_, address owner_)
    constructorArguments: [VAULT_FACTORY, DEPLOYER],
  },
] as const;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const network = await hre.ethers.provider.getNetwork();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Blin Finance — Contract Verification");
  console.log(`  Network: ${network.name} (chainId ${network.chainId})`);
  console.log("═══════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  for (const c of CONTRACTS) {
    console.log(`  Verifying ${c.name}`);
    console.log(`  Address:  ${c.address}`);

    try {
      await hre.run("verify:verify", {
        address:              c.address,
        contract:             c.contract,
        constructorArguments: c.constructorArguments,
      });
      console.log(`  ✓ Verified!`);
      console.log(`    https://sepolia.arbiscan.io/address/${c.address}#code`);
      passed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.toLowerCase().includes("already verified")) {
        console.log(`  ✓ Already verified (skipped)`);
        console.log(`    https://sepolia.arbiscan.io/address/${c.address}#code`);
        passed++;
      } else {
        console.error(`  ✗ FAILED: ${msg.split("\n")[0]}`);
        failed++;
      }
    }

    console.log();
  }

  console.log("═══════════════════════════════════════════════════");
  console.log(`  Done: ${passed} verified, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════\n");

  console.log("  Explorer links:");
  for (const c of CONTRACTS) {
    console.log(`  • ${c.name.padEnd(20)} https://sepolia.arbiscan.io/address/${c.address}#code`);
  }
  console.log();

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
