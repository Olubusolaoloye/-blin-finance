// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2}     from "forge-std/Script.sol";
import {MockERC20}            from "../src/test/MockERC20.sol";
import {BlinYieldDistributor} from "../src/BlinYieldDistributor.sol";

/// @notice Ethereum Sepolia (chainId 11155111) deployment.
///
///         Deploys a mintable mock $BLIN token and a BlinYieldDistributor seeded
///         with 1,000,000 mock $BLIN so that yield claims can be tested end-to-end.
///         On testnet the deployer acts as both the signing key and the owner.
///         On mainnet these roles are held by a backend hot-wallet (signer) and
///         a multisig (owner) respectively.
///
///         Required env vars:
///           DEPLOYER_PRIVATE_KEY   — deployer private key (hex, no 0x prefix)
///           DEPLOYER_ADDRESS       — corresponding address
///
///         Run:
///           forge script script/DeployEthSepolia.s.sol \
///             --rpc-url eth_sepolia \
///             --broadcast \
///             --verify \
///             --etherscan-api-key $ETHERSCAN_API_KEY
///
///         After deployment, paste the printed addresses into the `eth` sub-object
///         of every BSC testnet entry in packages/shared/src/addresses.ts.
///
///         Faucet: users can call mockBlin.faucet() to self-mint 10,000 mBLIN.
contract DeployEthSepoliaScript is Script {

    /// @dev Initial $BLIN reserve seeded into the distributor.
    uint256 constant INITIAL_BLIN_RESERVE = 1_000_000 * 1e18;

    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        // ── 1. Mock $BLIN (18 decimals — matches mainnet $BLIN) ──────────────
        MockERC20 mockBlin = new MockERC20("Mock BLIN", "mBLIN", 18);

        // ── 2. BlinYieldDistributor ───────────────────────────────────────────
        //       On testnet: deployer = signer (backend hot-wallet on mainnet)
        //                   deployer = owner  (multisig on mainnet)
        BlinYieldDistributor distributor = new BlinYieldDistributor(
            address(mockBlin),
            deployer, // signer
            deployer  // owner
        );

        // ── 3. Seed distributor with 1 M mock $BLIN ───────────────────────────
        mockBlin.mint(address(distributor), INITIAL_BLIN_RESERVE);

        vm.stopBroadcast();

        // ── Print addresses ───────────────────────────────────────────────────
        console2.log("=== Blin Testnet Deployment (Ethereum Sepolia 11155111) ===");
        console2.log("MockBLIN (mBLIN):     ", address(mockBlin));
        console2.log("BlinYieldDistributor: ", address(distributor));
        console2.log("Distributor reserve:  ", distributor.blinReserve());
        console2.log("");
        console2.log("Paste into the `eth` sub-object for BSC testnet entries in");
        console2.log("packages/shared/src/addresses.ts  (chainId 97 and 421614):");
        console2.log("  blinYieldDistributor: \"", address(distributor), "\"");
        console2.log("  blinToken:            \"", address(mockBlin),    "\"");
        console2.log("");
        console2.log("Faucet: users call mockBlin.faucet() to self-mint 10,000 mBLIN.");
    }
}
