// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAaveV3Pool} from "../interfaces/IAaveV3Pool.sol";

/// @title MockAavePool
/// @notice Satisfies IAaveV3Pool without connecting to real Aave.
///         Tokens deposited via supply() are held in this contract and
///         returned 1:1 on withdraw() — no yield, no slippage, no failures.
///
///         Usage: pass this address as `aavePool` to VaultFactory on testnet
///         so that AaveV3Strategy works without any external dependency.
contract MockAavePool is IAaveV3Pool {
    using SafeERC20 for IERC20;

    // user → asset → balance deposited via this mock pool
    mapping(address => mapping(address => uint256)) public deposits;

    /// @inheritdoc IAaveV3Pool
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16  /*referralCode*/
    ) external override {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        deposits[onBehalfOf][asset] += amount;
    }

    /// @inheritdoc IAaveV3Pool
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        uint256 available = deposits[msg.sender][asset];
        uint256 toSend = amount > available ? available : amount;
        if (toSend == 0) return 0;
        deposits[msg.sender][asset] -= toSend;
        IERC20(asset).safeTransfer(to, toSend);
        return toSend;
    }
}
