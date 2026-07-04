// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {VaultFactory}     from "../src/VaultFactory.sol";
import {SaveSwap}         from "../src/SaveSwap.sol";
import {MockERC20}        from "../src/test/MockERC20.sol";

/// @notice BSC Testnet (chainId 97) deployment — no real assets, no multisig.
///
///         Deploys a mintable mock USDC (6 dec), VaultFactory, and SaveSwap.
///         Uses the real BSC Testnet PancakeSwap V2 Router and WBNB so that
///         real testnet swaps work end-to-end.
///
///         Required env vars:
///           DEPLOYER_PRIVATE_KEY   — deployer private key (hex, no 0x prefix)
///           DEPLOYER_ADDRESS       — corresponding address
///
///         Run:
///           forge script script/DeployTestnet.s.sol \
///             --rpc-url bsc_testnet \
///             --broadcast \
///             --verify \
///             --etherscan-api-key $BSCSCAN_API_KEY
///
///         After deployment, paste the printed addresses into:
///           packages/shared/src/addresses.ts  (chainId 97)
///
///         Faucet: users can call mockUsdc.faucet() to self-mint 10,000 mUSDC.
contract DeployTestnetScript is Script {

    // ── BSC Testnet constants ─────────────────────────────────────────────────
    /// @dev PancakeSwap V2 Router02 on BSC Testnet.
    address constant ROUTER_TESTNET = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
    /// @dev WBNB on BSC Testnet.
    address constant WBNB_TESTNET   = 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd;

    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        // ── 1. Mock USDC (6 decimals — matches mainnet USDC) ─────────────────
        MockERC20 mockUsdc = new MockERC20("Mock USDC", "mUSDC", 6);

        // Seed the deployer with 1,000,000 mUSDC for testing
        mockUsdc.mint(deployer, 1_000_000 * 1e6);

        // ── 2. VaultFactory (saveSwap_ = address(0) initially) ───────────────
        //       treasury = deployer on testnet (penalty fees go to deployer)
        VaultFactory factory = new VaultFactory(
            address(mockUsdc),
            deployer,      // treasury
            address(0),    // saveSwap wired below
            deployer       // owner (multisig on mainnet)
        );

        // ── 3. SaveSwap ───────────────────────────────────────────────────────
        SaveSwap swap = new SaveSwap(
            ROUTER_TESTNET,
            address(mockUsdc),
            WBNB_TESTNET,
            address(factory),
            deployer       // owner
        );

        // ── 4. Wire SaveSwap into VaultFactory ────────────────────────────────
        factory.setSaveSwap(address(swap));

        vm.stopBroadcast();

        // ── Print addresses ───────────────────────────────────────────────────
        console2.log("=== Blin Testnet Deployment (BSC Testnet 97) ===");
        console2.log("MockUSDC (mUSDC):", address(mockUsdc));
        console2.log("VaultFactory:    ", address(factory));
        console2.log("SaveSwap:        ", address(swap));
        console2.log("");
        console2.log("Paste into packages/shared/src/addresses.ts  (chainId 97):");
        console2.log("  vaultFactory:  \"", address(factory), "\"");
        console2.log("  saveSwap:      \"", address(swap),    "\"");
        console2.log("  usdc:          \"", address(mockUsdc),"\"");
        console2.log("  wbnb:          \"", WBNB_TESTNET,     "\"");
        console2.log("  pancakeRouter: \"", ROUTER_TESTNET,   "\"");
        console2.log("  treasury:      \"", deployer,         "\"");
        console2.log("");
        console2.log("Faucet: users call mockUsdc.faucet() to self-mint 10,000 mUSDC.");
    }
}
