// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2}       from "forge-std/Script.sol";
import {BlinYieldDistributor}   from "../src/BlinYieldDistributor.sol";

/// @notice Ethereum Mainnet deployment — BlinYieldDistributor.
///
///         Required env vars:
///           DEPLOYER_PRIVATE_KEY  — deployer private key
///           MULTISIG_ADDRESS      — protocol multisig (contract owner)
///           SIGNER_ADDRESS        — backend wallet that signs claim vouchers
///
///         $BLIN on Ethereum (live): 0xaEFB54306240502c5421Be478fa16aACfA9698A2
///
///         Run:
///           forge script script/DeployDistributor.s.sol \
///             --rpc-url ethereum \
///             --broadcast \
///             --verify \
///             --etherscan-api-key $ETHERSCAN_API_KEY
///
///         Post-deploy:
///           1. Treasury sends $BLIN to the deployed BlinYieldDistributor address.
///           2. Backend begins watching BSC for BlinYieldFinalized events and
///              issuing EIP-712 signed vouchers for users to claim on ETH.
///
///         Voucher nonce convention (recommended):
///           nonce = keccak256(abi.encode(BSC_CHAIN_ID=56, lockId, userAddress))
///         This guarantees each BSC lock maps to at most one ETH claim.
contract DeployDistributorScript is Script {

    /// @dev Live $BLIN token on Ethereum Mainnet.
    address constant BLIN = 0xaEFB54306240502c5421Be478fa16aACfA9698A2;

    function run() external {
        address multisig = vm.envAddress("MULTISIG_ADDRESS");
        address signerWallet = vm.envAddress("SIGNER_ADDRESS");

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        BlinYieldDistributor distributor = new BlinYieldDistributor(
            BLIN,
            signerWallet,
            multisig
        );
        console2.log("BlinYieldDistributor:", address(distributor));

        vm.stopBroadcast();

        console2.log("---");
        console2.log("Update packages/shared/src/addresses.ts chain 1:");
        console2.log("  blinYieldDistributor:", address(distributor));
        console2.log("  blinToken:           ", BLIN);
        console2.log("Next: treasury transfers $BLIN to distributor address.");
    }
}
