// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {VaultFactory}     from "../src/VaultFactory.sol";
import {SaveSwap}         from "../src/SaveSwap.sol";

/// @notice BSC Mainnet deployment — VaultFactory + SaveSwap.
///
///         Required env vars:
///           DEPLOYER_PRIVATE_KEY  — deployer private key
///           MULTISIG_ADDRESS      — protocol multisig (contract owner)
///           TREASURY_ADDRESS      — receives early-exit USDC penalties
///
///         Hardcoded BSC Mainnet constants:
///           USDC   = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
///           WBNB   = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
///           ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E  (PancakeSwap V2)
///
///         Run:
///           forge script script/Deploy.s.sol \
///             --rpc-url bsc \
///             --broadcast \
///             --verify \
///             --etherscan-api-key $BSCSCAN_API_KEY
///
///         Then deploy BlinYieldDistributor on Ethereum:
///           forge script script/DeployDistributor.s.sol \
///             --rpc-url ethereum \
///             --broadcast \
///             --verify \
///             --etherscan-api-key $ETHERSCAN_API_KEY
contract DeployScript is Script {

    address constant USDC   = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
    address constant WBNB   = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;

    function run() external {
        address multisig = vm.envAddress("MULTISIG_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        // 1. Deploy VaultFactory (saveSwap = address(0) initially)
        VaultFactory factory = new VaultFactory(
            USDC,
            treasury,
            address(0),
            multisig
        );
        console2.log("VaultFactory:", address(factory));

        // 2. Deploy SaveSwap
        SaveSwap swap = new SaveSwap(
            ROUTER,
            USDC,
            WBNB,
            address(factory),
            multisig
        );
        console2.log("SaveSwap:    ", address(swap));

        // 3. Wire SaveSwap into VaultFactory
        factory.setSaveSwap(address(swap));

        vm.stopBroadcast();

        console2.log("---");
        console2.log("Update packages/shared/src/addresses.ts chain 56:");
        console2.log("  vaultFactory:  ", address(factory));
        console2.log("  saveSwap:      ", address(swap));
        console2.log("  usdc:          ", USDC);
        console2.log("  wbnb:          ", WBNB);
        console2.log("  pancakeRouter: ", ROUTER);
        console2.log("  treasury:      ", treasury);
    }
}
