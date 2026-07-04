// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AutoSaveVault} from "./AutoSaveVault.sol";

/// @title BLINSaveUSDC
/// @notice Thin alias of AutoSaveVault pre-labelled for USDC.
///         VaultFactory deploys AutoSaveVault directly; this contract is kept
///         for ABI-compatibility reference only.
contract BLINSaveUSDC is AutoSaveVault {
    constructor(address usdc_, address treasury_, address admin_)
        AutoSaveVault(usdc_, treasury_, admin_)
    {}
}
