// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AutoSaveVault} from "./AutoSaveVault.sol";

/// @title BLINSaveUSDT
/// @notice Convenience deployment of AutoSaveVault pre-configured for USDT.
///         Deployed by VaultFactory on BSC / Ethereum.
contract BLINSaveUSDT is AutoSaveVault {
    constructor(
        address usdt,
        address admin,
        address penaltyReceiver,
        address yieldStrategy
    )
        AutoSaveVault(
            IERC20(usdt),
            "Blin Save USDT",
            "bsUSDT",
            admin,
            penaltyReceiver,
            yieldStrategy
        )
    {}
}
