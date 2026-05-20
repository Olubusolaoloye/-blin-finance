// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {AutoSaveVault} from "./AutoSaveVault.sol";
import {VaultFactory} from "./VaultFactory.sol";

// ─── Custom errors ────────────────────────────────────────────────────────────

error ZeroAmount();
error InvalidSaveBps(uint256 bps);
error SwapFailed();
error DeadlinePassed(uint256 deadline, uint256 currentTime);
error UnsupportedAggregator(address aggregator);

/// @title SaveSwap
/// @notice Entry-point contract for the Blin AutoSave swap flow.
///         1. Accepts tokenIn from the user.
///         2. Forwards the swap to an approved DEX aggregator.
///         3. Routes `saveBps` of tokenOut into the user's AutoSaveVault,
///            sending the remainder to the user's wallet.
///
///         If the user has an explicit vault set, that is used.
///         Otherwise, VaultFactory.getOrCreateVault(msg.sender) is called.
contract SaveSwap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MAX_SAVE_BPS = 5000; // 50%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ─── State ────────────────────────────────────────────────────────────────

    VaultFactory public vaultFactory;

    /// Approved aggregator contracts (ParaSwap, 1inch, etc.)
    mapping(address => bool) public approvedAggregators;

    /// Per-user explicit vault override. address(0) = use factory.
    mapping(address => address) public userVaultOverride;

    // ─── Events ───────────────────────────────────────────────────────────────

    event SwapAndSaved(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 savedAmount,
        address vault,
        uint256 saveBps
    );
    event AggregatorUpdated(address indexed aggregator, bool approved);
    event VaultFactoryUpdated(address indexed oldFactory, address indexed newFactory);
    event UserVaultOverrideSet(address indexed user, address indexed vault);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address vaultFactory_, address owner_) Ownable(owner_) {
        vaultFactory = VaultFactory(vaultFactory_);
    }

    // ─── Core swap ────────────────────────────────────────────────────────────

    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 saveBps;
        address aggregator;
        bytes aggregatorData;
        uint256 deadline;
    }

    /// @notice Execute a swap via an approved aggregator and auto-save a portion.
    /// @param params  Swap configuration (see SwapParams).
    function swapAndSave(SwapParams calldata params) external nonReentrant returns (uint256 savedAmount) {
        if (block.timestamp > params.deadline) {
            revert DeadlinePassed(params.deadline, block.timestamp);
        }
        if (params.amountIn == 0) revert ZeroAmount();
        if (params.saveBps > MAX_SAVE_BPS) revert InvalidSaveBps(params.saveBps);
        if (!approvedAggregators[params.aggregator]) {
            revert UnsupportedAggregator(params.aggregator);
        }

        // Pull tokenIn from caller
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);

        // Approve aggregator and execute swap
        IERC20(params.tokenIn).safeIncreaseAllowance(params.aggregator, params.amountIn);
        uint256 balanceBefore = IERC20(params.tokenOut).balanceOf(address(this));

        (bool success,) = params.aggregator.call(params.aggregatorData);
        if (!success) revert SwapFailed();

        uint256 amountOut = IERC20(params.tokenOut).balanceOf(address(this)) - balanceBefore;
        if (amountOut < params.minAmountOut) revert SwapFailed();

        // Split: save portion → vault, remainder → user
        address vault = _resolveVault(msg.sender);
        savedAmount = Math.mulDiv(amountOut, params.saveBps, BPS_DENOMINATOR);
        uint256 userAmount = amountOut - savedAmount;

        if (savedAmount > 0) {
            IERC20(params.tokenOut).safeIncreaseAllowance(vault, savedAmount);
            // Deposit as unlocked liquidity into the vault (ERC-4626 deposit)
            AutoSaveVault(vault).deposit(savedAmount, msg.sender);
        }

        if (userAmount > 0) {
            IERC20(params.tokenOut).safeTransfer(msg.sender, userAmount);
        }

        emit SwapAndSaved(
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            savedAmount,
            vault,
            params.saveBps
        );
    }

    // ─── User vault override ──────────────────────────────────────────────────

    /// @notice Set an explicit vault address. Pass address(0) to revert to factory.
    function setVaultOverride(address vault) external {
        userVaultOverride[msg.sender] = vault;
        emit UserVaultOverrideSet(msg.sender, vault);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setAggregator(address aggregator, bool approved) external onlyOwner {
        approvedAggregators[aggregator] = approved;
        emit AggregatorUpdated(aggregator, approved);
    }

    function setVaultFactory(address newFactory) external onlyOwner {
        emit VaultFactoryUpdated(address(vaultFactory), newFactory);
        vaultFactory = VaultFactory(newFactory);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _resolveVault(address user) internal returns (address) {
        address override_ = userVaultOverride[user];
        if (override_ != address(0)) return override_;
        return vaultFactory.getOrCreateVault(user);
    }
}
