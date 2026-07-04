// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20}    from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev Minimal interface for MockERC20.mint — all testnet tokens implement this.
interface IMintable {
    function mint(address to, uint256 amount) external;
}

/// @title  MockRouter
/// @notice Drop-in IPancakeRouter02 stub for non-BSC testnets (Arbitrum Sepolia, etc.).
///
///         All swaps execute at a 1:1 rate with no slippage:
///           • Token → token : pulls input, calls MockERC20.mint() for output.
///           • ETH   → token : accepts ETH, calls MockERC20.mint() for output.
///           • Token → ETH   : pulls input, sends ETH from router balance.
///
///         Fund the router with a small amount of ETH to support the ETH-output path.
///         For testnet / CI use only — never deploy to mainnet.
contract MockRouter {
    using SafeERC20 for IERC20;

    address public immutable weth;

    constructor(address weth_) {
        weth = weth_;
    }

    // ─── IPancakeRouter02 read ────────────────────────────────────────────────

    function WETH() external view returns (address) { return weth; }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        pure
        returns (uint256[] memory amounts)
    {
        amounts = new uint256[](path.length);
        for (uint256 i = 0; i < path.length; i++) {
            amounts[i] = amountIn; // 1:1 throughout the path
        }
    }

    // ─── ERC-20 → ERC-20 ─────────────────────────────────────────────────────

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 /* amountOutMin */,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external returns (uint256[] memory amounts) {
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        IMintable(path[path.length - 1]).mint(to, amountIn);

        amounts = new uint256[](path.length);
        amounts[path.length - 1] = amountIn;
    }

    // ─── Native ETH → ERC-20 ─────────────────────────────────────────────────

    function swapExactETHForTokens(
        uint256 /* amountOutMin */,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external payable returns (uint256[] memory amounts) {
        IMintable(path[path.length - 1]).mint(to, msg.value);

        amounts = new uint256[](path.length);
        amounts[path.length - 1] = msg.value;
    }

    // ─── ERC-20 → Native ETH ─────────────────────────────────────────────────

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 /* amountOutMin */,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external returns (uint256[] memory amounts) {
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        (bool ok,) = to.call{value: amountIn}("");
        require(ok, "MockRouter: ETH transfer failed");

        amounts = new uint256[](path.length);
        amounts[path.length - 1] = amountIn;
    }

    /// @dev Accept ETH sent directly (funds the ETH-output swap path).
    receive() external payable {}
}
