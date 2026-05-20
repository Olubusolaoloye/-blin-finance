// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IYieldStrategy
/// @notice Interface for pluggable yield strategies used by AutoSaveVault.
///         Initial implementation routes through Aave V3; replaceable via
///         the 48-hour admin timelock.
interface IYieldStrategy {
    /// @notice Deposit `amount` of the underlying asset into the yield source.
    /// @param asset  ERC-20 token to deposit.
    /// @param amount Amount to deposit (in asset decimals).
    function deposit(address asset, uint256 amount) external;

    /// @notice Withdraw `amount` of underlying from the yield source.
    /// @param asset     ERC-20 token to withdraw.
    /// @param amount    Amount to withdraw (in asset decimals).
    /// @param recipient Address to receive the withdrawn tokens.
    function withdraw(address asset, uint256 amount, address recipient) external;

    /// @notice Returns the current value (principal + yield) of all assets
    ///         deposited via this strategy, denominated in the underlying asset.
    function totalValue(address asset) external view returns (uint256);

    /// @notice Returns the current APY in basis points (e.g., 450 = 4.50%).
    function currentApyBps(address asset) external view returns (uint256);
}
