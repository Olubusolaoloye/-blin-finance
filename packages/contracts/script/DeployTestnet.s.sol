// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {VaultFactory}  from "../src/VaultFactory.sol";
import {SaveSwap}      from "../src/SaveSwap.sol";
import {MockERC20}     from "../src/test/MockERC20.sol";
import {MockAavePool}  from "../src/test/MockAavePool.sol";

/// @notice Testnet deployment — no Aave, no multisig.
///         Deploys a mintable mock USDC, a no-op Aave pool shim,
///         then VaultFactory + SaveSwap exactly as the mainnet script does.
///
/// Prerequisites:
///   1. Install Foundry:  curl -L https://foundry.paradigm.xyz | bash && foundryup
///   2. Copy .env.testnet.example to .env.testnet and fill in values
///   3. Run:
///        source .env.testnet
///        forge script script/DeployTestnet.s.sol \
///          --rpc-url $RPC_URL \
///          --broadcast \
///          --verify \
///          --etherscan-api-key $ETHERSCAN_KEY
///
/// After deployment, copy the printed addresses into:
///   packages/shared/src/addresses.ts  (for the matching chainId)
///
/// .env.testnet keys:
///   DEPLOYER_PRIVATE_KEY  — deployer wallet private key
///   DEPLOYER_ADDRESS      — deployer wallet address
///   RPC_URL               — testnet RPC (e.g. Arbitrum Sepolia, BSC Testnet)
///   ETHERSCAN_KEY         — block explorer API key for --verify
contract DeployTestnetScript is Script {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        // ── 1. Mock USDC (6 decimals — matches mainnet USDC) ─────────────────
        MockERC20 mockUsdc = new MockERC20("Mock USDC", "mUSDC", 6);

        // Seed the deployer with 1,000,000 mUSDC for testing
        mockUsdc.mint(deployer, 1_000_000 * 1e6);

        // ── 2. Mock Aave pool — holds tokens, no yield ────────────────────────
        MockAavePool mockAave = new MockAavePool();

        // ── 3. VaultFactory — identical constructor to mainnet ────────────────
        //       treasury = deployer on testnet (penalty fees go to deployer)
        VaultFactory factory = new VaultFactory(
            address(mockUsdc),
            address(mockAave),
            deployer,   // penaltyReceiver
            deployer    // owner
        );

        // ── 4. SaveSwap ───────────────────────────────────────────────────────
        SaveSwap swap = new SaveSwap(address(factory), deployer);

        vm.stopBroadcast();

        // ── Print addresses ───────────────────────────────────────────────────
        console2.log("=== Blin Testnet Deployment ===");
        console2.log("MockUSDC:    ", address(mockUsdc));
        console2.log("MockAavePool:", address(mockAave));
        console2.log("VaultFactory:", address(factory));
        console2.log("SaveSwap:    ", address(swap));
        console2.log("");
        console2.log("Paste into packages/shared/src/addresses.ts:");
        console2.log("  vaultFactory: \"", address(factory), "\"");
        console2.log("  saveSwap:     \"", address(swap),    "\"");
        console2.log("");
        console2.log("Faucet: users can call mockUsdc.faucet() to self-mint 10,000 mUSDC");
    }
}
