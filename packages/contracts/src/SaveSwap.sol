// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20}          from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20}       from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable}         from "@openzeppelin/contracts/access/Ownable.sol";
import {Math}            from "@openzeppelin/contracts/utils/math/Math.sol";
import {IPancakeRouter02} from "./interfaces/IPancakeRouter.sol";
import {AutoSaveVault}   from "./AutoSaveVault.sol";
import {VaultFactory}    from "./VaultFactory.sol";

// ─── Custom errors ────────────────────────────────────────────────────────────

error ZeroAmount();
error ZeroAddress();
error InvalidSaveBps(uint256 bps);
error DeadlinePassed(uint256 deadline, uint256 current);
error SwapFailed();
error NativeTransferFailed();
error InvalidPath();

/// @title SaveSwap
/// @notice Executes token swaps via PancakeSwap V2 and automatically routes a
///         user-defined percentage of the output into an AutoSaveVault as a
///         time-locked USDC position rewarded in $BLIN.
///
///         Swap flow:
///           1. Execute main swap (tokenIn → tokenOut) via PancakeSwap V2.
///           2. Compute:
///                saveAmount = amountOut × saveBps / 10_000
///                userAmount = amountOut − saveAmount
///           3. If tokenOut ≠ USDC, swap saveAmount → USDC via PancakeSwap.
///           4. Transfer USDC to the user's vault and call
///              vault.createLockFor(user, usdcAmount, lockDuration, "AutoSave").
///           5. Send userAmount of tokenOut back to the user.
///
///         Native BNB is supported as tokenIn or tokenOut via the NATIVE sentinel
///         (0xEeeee…EeE).  When tokenIn == NATIVE, msg.value is used as amountIn.
///
/// @dev    SaveSwap must hold OPERATOR_ROLE on every AutoSaveVault it targets.
///         VaultFactory handles role wiring automatically during vault deployment.
contract SaveSwap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @dev Sentinel address for native BNB (EIP-7528 canonical address).
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    uint256 public constant MAX_SAVE_BPS    = 5_000;  // 50 %
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ─── Immutables ───────────────────────────────────────────────────────────

    /// @notice PancakeSwap V2 Router02.
    ///         BSC Mainnet: 0x10ED43C718714eb63d5aA57B78B54704E256024E
    IPancakeRouter02 public immutable router;

    /// @notice USDC on BSC (6 decimals).
    ///         BSC Mainnet: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
    IERC20 public immutable usdc;

    /// @notice WBNB on BSC — used as intermediate hop in BNB ↔ token paths.
    ///         BSC Mainnet: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
    address public immutable wbnb;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice VaultFactory that deploys and locates per-user AutoSaveVaults.
    VaultFactory public vaultFactory;

    // ─── Events ───────────────────────────────────────────────────────────────

    event SwapAndSaved(
        address indexed user,
        address         tokenIn,
        address         tokenOut,
        uint256         amountIn,
        uint256         amountOut,
        uint256         usdcSaved,
        uint256         lockId,
        uint256         saveBps
    );
    event VaultFactoryUpdated(address indexed oldFactory, address indexed newFactory);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param router_       PancakeSwap V2 Router02 address.
    /// @param usdc_         USDC token address on BSC.
    /// @param wbnb_         WBNB token address on BSC.
    /// @param vaultFactory_ Deployed VaultFactory address.
    /// @param owner_        Protocol multisig / admin.
    constructor(
        address router_,
        address usdc_,
        address wbnb_,
        address vaultFactory_,
        address owner_
    ) Ownable(owner_) {
        if (router_       == address(0) ||
            usdc_         == address(0) ||
            wbnb_         == address(0) ||
            vaultFactory_ == address(0) ||
            owner_        == address(0)) revert ZeroAddress();

        router       = IPancakeRouter02(router_);
        usdc         = IERC20(usdc_);
        wbnb         = wbnb_;
        vaultFactory = VaultFactory(vaultFactory_);
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /// @notice Parameters for a single swapAndSave call.
    struct SwapParams {
        /// @dev tokenIn: use NATIVE (0xEeee…EeE) for native BNB input.
        address   tokenIn;
        /// @dev tokenOut: use NATIVE (0xEeee…EeE) for native BNB output.
        address   tokenOut;
        /// @dev amountIn: ignored when tokenIn == NATIVE; use msg.value instead.
        uint256   amountIn;
        /// @dev Minimum tokenOut from the main swap (slippage protection).
        uint256   minAmountOut;
        /// @dev Portion of amountOut to save: 0–5000 (0–50 %).  0 = no save.
        uint256   saveBps;
        /// @dev Minimum USDC received from the save→USDC conversion swap.
        ///      Set to 0 to skip slippage check on the save leg.
        uint256   minSaveUsdc;
        /// @dev Duration to lock the saved USDC [MIN_LOCK, MAX_LOCK] in seconds.
        uint256   lockDuration;
        /// @dev PancakeSwap path for the main swap.
        ///      BNB input  → path[0] must be WBNB.
        ///      BNB output → path[last] must be WBNB.
        address[] pathMain;
        /// @dev PancakeSwap path for save → USDC conversion.
        ///      Leave empty (length 0) when tokenOut == USDC (no conversion needed).
        ///      BNB save → path[0] must be WBNB.
        address[] pathSave;
        /// @dev Unix timestamp — tx reverts after this.
        uint256   deadline;
    }

    /// @notice Execute a PancakeSwap and auto-save a portion as a USDC vault lock.
    /// @dev    For ERC-20 input: caller must approve this contract for `amountIn`.
    ///         For BNB input: send BNB as msg.value; `p.amountIn` is ignored.
    /// @return lockId  The AutoSaveVault lock ID.  Returns type(uint256).max if
    ///                 saveBps == 0 (no lock was created).
    function swapAndSave(SwapParams calldata p)
        external
        payable
        nonReentrant
        returns (uint256 lockId)
    {
        // ── Validation ────────────────────────────────────────────────────────
        if (block.timestamp > p.deadline) revert DeadlinePassed(p.deadline, block.timestamp);
        if (p.saveBps > MAX_SAVE_BPS)     revert InvalidSaveBps(p.saveBps);
        if (p.pathMain.length < 2)        revert InvalidPath();

        uint256 amountIn = (p.tokenIn == NATIVE) ? msg.value : p.amountIn;
        if (amountIn == 0) revert ZeroAmount();

        // ── Pull ERC-20 input (BNB is already in msg.value) ───────────────────
        if (p.tokenIn != NATIVE) {
            IERC20(p.tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
            IERC20(p.tokenIn).safeIncreaseAllowance(address(router), amountIn);
        }

        // ── Execute main swap via PancakeSwap V2 ──────────────────────────────
        uint256 amountOut = _mainSwap(p, amountIn);
        if (amountOut < p.minAmountOut) revert SwapFailed();

        // ── No-save fast path ─────────────────────────────────────────────────
        if (p.saveBps == 0) {
            _sendToUser(p.tokenOut, msg.sender, amountOut);
            return type(uint256).max; // sentinel: no lock created
        }

        // ── Split: saveAmount → vault, userAmount → caller ────────────────────
        uint256 saveAmount = Math.mulDiv(amountOut, p.saveBps, BPS_DENOMINATOR);

        // BPS rounding can produce saveAmount == 0 for tiny outputs — skip save.
        if (saveAmount == 0) {
            _sendToUser(p.tokenOut, msg.sender, amountOut);
            return type(uint256).max;
        }

        uint256 userAmount = amountOut - saveAmount;

        uint256 usdcSaved;
        (lockId, usdcSaved) = _saveToVault(p, saveAmount);

        if (userAmount > 0) {
            _sendToUser(p.tokenOut, msg.sender, userAmount);
        }

        emit SwapAndSaved(
            msg.sender,
            p.tokenIn,
            p.tokenOut,
            amountIn,
            amountOut,
            usdcSaved,
            lockId,
            p.saveBps
        );
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Update the VaultFactory address.
    function setVaultFactory(address newFactory) external onlyOwner {
        if (newFactory == address(0)) revert ZeroAddress();
        emit VaultFactoryUpdated(address(vaultFactory), newFactory);
        vaultFactory = VaultFactory(newFactory);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Executes the main swap and returns the raw amountOut.
    function _mainSwap(SwapParams calldata p, uint256 amountIn)
        internal
        returns (uint256 amountOut)
    {
        uint256[] memory amounts;

        if (p.tokenIn == NATIVE) {
            // BNB → ERC-20
            amounts = router.swapExactETHForTokens{value: amountIn}(
                0,             // no inner slippage — we check amountOut afterward
                p.pathMain,
                address(this),
                p.deadline
            );
        } else if (p.tokenOut == NATIVE) {
            // ERC-20 → BNB
            amounts = router.swapExactTokensForETH(
                amountIn,
                0,
                p.pathMain,
                address(this),
                p.deadline
            );
        } else {
            // ERC-20 → ERC-20
            amounts = router.swapExactTokensForTokens(
                amountIn,
                0,
                p.pathMain,
                address(this),
                p.deadline
            );
        }

        amountOut = amounts[amounts.length - 1];
    }

    /// @dev Converts saveAmount of tokenOut to USDC, sends it to the user's vault,
    ///      and calls createLockFor(). Returns (lockId, usdcAmount).
    function _saveToVault(SwapParams calldata p, uint256 saveAmount)
        internal
        returns (uint256 lockId, uint256 usdcAmount)
    {
        address vault = vaultFactory.getOrCreateVault(msg.sender);

        if (p.tokenOut == address(usdc)) {
            // ── tokenOut is already USDC — send directly ──────────────────────
            usdcAmount = saveAmount;
            usdc.safeTransfer(vault, usdcAmount);

        } else if (p.tokenOut == NATIVE) {
            // ── BNB save amount → USDC via PancakeSwap ────────────────────────
            if (p.pathSave.length < 2) revert InvalidPath();

            // Route the BNB directly to the vault; capture USDC received.
            uint256[] memory amounts = router.swapExactETHForTokens{value: saveAmount}(
                p.minSaveUsdc,
                p.pathSave,
                vault,          // PancakeSwap sends USDC straight to vault
                p.deadline
            );
            usdcAmount = amounts[amounts.length - 1];

        } else {
            // ── ERC-20 save amount → USDC via PancakeSwap ─────────────────────
            if (p.pathSave.length < 2) revert InvalidPath();

            IERC20(p.tokenOut).safeIncreaseAllowance(address(router), saveAmount);

            // Route the ERC-20 save directly to the vault; capture USDC received.
            uint256[] memory amounts = router.swapExactTokensForTokens(
                saveAmount,
                p.minSaveUsdc,
                p.pathSave,
                vault,          // PancakeSwap sends USDC straight to vault
                p.deadline
            );
            usdcAmount = amounts[amounts.length - 1];
        }

        // The vault already holds the USDC (sent by safeTransfer or PancakeSwap).
        // createLockFor() trusts this — it does NOT pull funds again.
        lockId = AutoSaveVault(vault).createLockFor(
            msg.sender,
            usdcAmount,
            p.lockDuration,
            bytes32("AutoSave")
        );
    }

    /// @dev Sends tokenOut (or BNB) to a recipient.
    function _sendToUser(address token, address to, uint256 amount) internal {
        if (token == NATIVE) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /// @dev Accept BNB returned by PancakeSwap when tokenOut == NATIVE.
    receive() external payable {}
}
