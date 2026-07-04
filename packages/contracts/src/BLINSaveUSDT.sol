// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AutoSaveVault} from "./AutoSaveVault.sol";

/// @title BLINSaveUSDT
/// @notice Thin alias of AutoSaveVault pre-labelled for USDT.
contract BLINSaveUSDT is AutoSaveVault {
    constructor(address usdt_, address treasury_, address admin_)
        AutoSaveVault(usdt_, treasury_, admin_)
    {}
}
