// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IYieldStrategy} from "./interfaces/IYieldStrategy.sol";
import {IAaveV3Pool} from "./interfaces/IAaveV3Pool.sol";

/// @title AaveV3Strategy
/// @notice IYieldStrategy implementation that routes funds through Aave V3.
///         Owned by the AutoSaveVault that deploys it.
contract AaveV3Strategy is IYieldStrategy, Ownable {
    using SafeERC20 for IERC20;

    IAaveV3Pool public immutable aavePool;

    constructor(address _aavePool, address _owner) Ownable(_owner) {
        aavePool = IAaveV3Pool(_aavePool);
    }

    /// @inheritdoc IYieldStrategy
    function deposit(address asset, uint256 amount) external onlyOwner {
        IERC20(asset).safeIncreaseAllowance(address(aavePool), amount);
        aavePool.supply(asset, amount, address(this), 0);
    }

    /// @inheritdoc IYieldStrategy
    function withdraw(address asset, uint256 amount, address recipient) external onlyOwner {
        aavePool.withdraw(asset, amount, recipient);
    }

    /// @inheritdoc IYieldStrategy
    /// @dev Returns zero during bootstrap (Phase 2). Phase 3 wires the aToken balance.
    function totalValue(address /*asset*/) external pure returns (uint256) {
        return 0;
    }

    /// @inheritdoc IYieldStrategy
    function currentApyBps(address /*asset*/) external pure returns (uint256) {
        return 0;
    }

    /// @notice Rescue accidentally-sent tokens. Only callable by owner (vault).
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
