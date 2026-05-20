// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {SaveSwap} from "../src/SaveSwap.sol";
import {AaveV3Strategy} from "../src/AaveV3Strategy.sol";

/// @notice Deploys VaultFactory + SaveSwap.
///         Run with:
///           forge script script/Deploy.s.sol --rpc-url bsc --broadcast --verify
///
///         Writes deployed addresses to stdout for copy-paste into
///         packages/shared/src/addresses.ts
contract DeployScript is Script {
    function run() external {
        address deployer     = vm.envAddress("DEPLOYER_ADDRESS");
        address treasury     = vm.envAddress("TREASURY_ADDRESS");
        address asset        = vm.envAddress("ASSET_ADDRESS");      // e.g. USDC on BSC
        address aavePool     = vm.envAddress("AAVE_POOL_ADDRESS");
        address multisig     = vm.envAddress("MULTISIG_ADDRESS");

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        VaultFactory factory = new VaultFactory(asset, aavePool, treasury, deployer);
        SaveSwap swap        = new SaveSwap(address(factory), deployer);

        // Transfer ownership to multisig
        factory.transferOwnership(multisig);
        swap.transferOwnership(multisig);

        vm.stopBroadcast();

        console2.log("VaultFactory:", address(factory));
        console2.log("SaveSwap:    ", address(swap));
        console2.log("Update packages/shared/src/addresses.ts with these values.");
    }
}
