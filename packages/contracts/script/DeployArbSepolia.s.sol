// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {VaultFactory}     from "../src/VaultFactory.sol";
import {SaveSwap}         from "../src/SaveSwap.sol";
import {MockERC20}        from "../src/test/MockERC20.sol";
import {MockRouter}       from "../src/test/MockRouter.sol";

/// @notice Arbitrum Sepolia (chainId 421614) deployment.
///
///         PancakeSwap V2 does not exist on Arbitrum Sepolia, so a MockRouter
///         is deployed instead.  It executes all swaps 1:1 by minting output
///         tokens on demand — sufficient to test the full vault locking flow.
///
///         Required env vars:
///           DEPLOYER_PRIVATE_KEY   — deployer private key (hex, no 0x prefix)
///           DEPLOYER_ADDRESS       — corresponding address
///
///         Run:
///           forge script script/DeployArbSepolia.s.sol \
///             --rpc-url arb_sepolia \
///             --broadcast \
///             --verify \
///             --etherscan-api-key $ARBISCAN_API_KEY
///
///         After deployment, paste the printed addresses into:
///           packages/shared/src/addresses.ts  (chainId 421614)
///
///         Faucet: users can call mockUsdc.faucet() to self-mint 10,000 mUSDC.
contract DeployArbSepoliaScript is Script {

    // ── Arbitrum Sepolia constants ─────────────────────────────────────────────
    /// @dev Canonical WETH on Arbitrum Sepolia.
    address constant WETH_ARB_SEPOLIA = 0x980B62Da83eFf3D4576C647993b0c1D7faf17c73;

    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        // ── 1. Mock USDC (6 decimals — matches mainnet USDC) ─────────────────
        MockERC20 mockUsdc = new MockERC20("Mock USDC", "mUSDC", 6);
        mockUsdc.mint(deployer, 1_000_000 * 1e6);

        // ── 2. MockRouter (1:1 swaps, mints output tokens) ───────────────────
        MockRouter mockRouter = new MockRouter(WETH_ARB_SEPOLIA);

        // ── 3. VaultFactory (saveSwap_ = address(0) initially) ───────────────
        VaultFactory factory = new VaultFactory(
            address(mockUsdc),
            deployer,   // treasury  (penalty fees)
            address(0), // saveSwap  (wired below)
            deployer    // owner     (multisig on mainnet)
        );

        // ── 4. SaveSwap ───────────────────────────────────────────────────────
        SaveSwap swap = new SaveSwap(
            address(mockRouter),
            address(mockUsdc),
            WETH_ARB_SEPOLIA,
            address(factory),
            deployer
        );

        // ── 5. Wire SaveSwap into VaultFactory ────────────────────────────────
        factory.setSaveSwap(address(swap));

        vm.stopBroadcast();

        // ── Print addresses ───────────────────────────────────────────────────
        console2.log("=== Blin Testnet Deployment (Arbitrum Sepolia 421614) ===");
        console2.log("MockUSDC (mUSDC):", address(mockUsdc));
        console2.log("MockRouter:      ", address(mockRouter));
        console2.log("VaultFactory:    ", address(factory));
        console2.log("SaveSwap:        ", address(swap));
        console2.log("");
        console2.log("Paste into packages/shared/src/addresses.ts  (chainId 421614):");
        console2.log("  vaultFactory:  \"", address(factory),     "\"");
        console2.log("  saveSwap:      \"", address(swap),        "\"");
        console2.log("  usdc:          \"", address(mockUsdc),    "\"");
        console2.log("  wbnb:          \"", WETH_ARB_SEPOLIA,     "\"");
        console2.log("  pancakeRouter: \"", address(mockRouter),  "\"");
        console2.log("  treasury:      \"", deployer,             "\"");
        console2.log("");
        console2.log("Faucet: users call mockUsdc.faucet() to self-mint 10,000 mUSDC.");
    }
}
