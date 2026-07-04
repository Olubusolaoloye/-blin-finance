// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Mock PancakeSwap V2 Router for testing SaveSwap.
///         Does 1:1 swaps (no price impact, no fee).
///         Pre-mint output tokens to this contract before using.
contract MockPancakeRouter {
    using SafeERC20 for IERC20;

    /// @dev BNB balance loaded via vm.deal in tests.
    receive() external payable {}

    // ─── PancakeSwap V2 interface ─────────────────────────────────────────────

    function WETH() external pure returns (address) {
        return 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c; // WBNB on BSC
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        pure
        returns (uint256[] memory amounts)
    {
        amounts = new uint256[](path.length);
        for (uint256 i = 0; i < path.length; i++) {
            amounts[i] = amountIn; // 1:1 at every hop
        }
    }

    /// @notice ERC-20 → ERC-20 swap. Pulls tokenIn from caller, sends tokenOut to `to`.
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 /*amountOutMin*/,
        address[] calldata path,
        address to,
        uint256 /*deadline*/
    ) external returns (uint256[] memory amounts) {
        address tokenIn  = path[0];
        address tokenOut = path[path.length - 1];

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(to, amountIn);   // 1:1 out

        amounts = new uint256[](path.length);
        amounts[path.length - 1] = amountIn;
    }

    /// @notice Native BNB → ERC-20 swap. Receives BNB via msg.value, sends tokenOut to `to`.
    function swapExactETHForTokens(
        uint256 /*amountOutMin*/,
        address[] calldata path,
        address to,
        uint256 /*deadline*/
    ) external payable returns (uint256[] memory amounts) {
        address tokenOut = path[path.length - 1];
        IERC20(tokenOut).safeTransfer(to, msg.value);  // 1:1 out

        amounts = new uint256[](path.length);
        amounts[path.length - 1] = msg.value;
    }

    /// @notice ERC-20 → Native BNB swap. Pulls tokenIn from caller, sends BNB to `to`.
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 /*amountOutMin*/,
        address[] calldata path,
        address to,
        uint256 /*deadline*/
    ) external returns (uint256[] memory amounts) {
        address tokenIn = path[0];
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        payable(to).transfer(amountIn);  // 1:1 BNB out

        amounts = new uint256[](path.length);
        amounts[path.length - 1] = amountIn;
    }
}
