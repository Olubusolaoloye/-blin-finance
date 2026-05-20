// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AutoSaveVault} from "./AutoSaveVault.sol";

/// @title BLINSaveUSDC
/// @notice Convenience deployment of AutoSaveVault pre-configured for USDC.
///         Deployed by VaultFactory on BSC / Ethereum / Arbitrum.
contract BLINSaveUSDC is AutoSaveVault {
    constructor(
        address usdc,
        address admin,
        address penaltyReceiver,
        address yieldStrategy
    )
        AutoSaveVault(
            IERC20(usdc),
            "Blin Save USDC",
            "bsUSDC",
            admin,
            penaltyReceiver,
            yieldStrategy
        )
    {}
}
