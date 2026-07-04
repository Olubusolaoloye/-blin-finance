// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IPancakeRouter02
/// @notice Subset of PancakeSwap V2 Router02 used by SaveSwap.
///         BSC Mainnet:  0x10ED43C718714eb63d5aA57B78B54704E256024E
interface IPancakeRouter02 {
    // ─── Read ─────────────────────────────────────────────────────────────────

    function WETH() external pure returns (address);

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    // ─── ERC-20 → ERC-20 ─────────────────────────────────────────────────────

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    // ─── Native BNB → ERC-20 ─────────────────────────────────────────────────

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    // ─── ERC-20 → Native BNB ─────────────────────────────────────────────────

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}
