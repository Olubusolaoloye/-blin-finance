// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IYieldStrategy} from "./interfaces/IYieldStrategy.sol";

// ─── Custom errors ────────────────────────────────────────────────────────────

error LockNotMatured(uint256 lockId, uint256 lockedUntil, uint256 currentTime);
error LockAlreadyMatured(uint256 lockId, uint256 lockedUntil, uint256 currentTime);
error LockDoesNotExist(uint256 lockId);
error InvalidLockDuration(uint256 duration, uint256 min, uint256 max);
error LockAlreadyBroken(uint256 lockId);
error UnauthorizedCaller(address caller);
error ZeroAmount();
error StrategyTimelockActive(uint256 unlockTime);
error NoPendingUpgrade();
error SameStrategy();

/// @title AutoSaveVault
/// @notice ERC-4626 vault with time-locked savings positions.
///         Each user can hold N independent locks. Breaking a lock early
///         incurs a 15% penalty on principal routed to the treasury.
///
///         Yield source is pluggable via IYieldStrategy with a 48-hour admin timelock.
contract AutoSaveVault is ERC4626, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MIN_LOCK_DURATION = 7 days;
    uint256 public constant MAX_LOCK_DURATION = 3 * 365 days;
    uint256 public constant PENALTY_BPS = 1500;      // 15%
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant STRATEGY_TIMELOCK = 48 hours;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ─── State ────────────────────────────────────────────────────────────────

    struct Lock {
        uint256 amount;       // principal (in underlying asset)
        uint256 lockedUntil;
        uint256 createdAt;
        bytes32 name;
        bool broken;
    }

    /// user => array of locks
    mapping(address => Lock[]) private _locks;

    address public penaltyReceiver;
    IYieldStrategy public yieldStrategy;

    /// Strategy upgrade timelock
    address public pendingStrategy;
    uint256 public strategyUnlockTime;

    // ─── Events ───────────────────────────────────────────────────────────────

    event LockCreated(
        address indexed user,
        uint256 indexed lockId,
        uint256 amount,
        uint256 lockedUntil,
        bytes32 name
    );
    event LockToppedUp(address indexed user, uint256 indexed lockId, uint256 addedAmount);
    event LockRenamed(address indexed user, uint256 indexed lockId, bytes32 newName);
    event LockWithdrawn(address indexed user, uint256 indexed lockId, uint256 amount);
    event LockBroken(
        address indexed user,
        uint256 indexed lockId,
        uint256 returnedAmount,
        uint256 penaltyAmount
    );
    event StrategyUpgradeScheduled(address indexed newStrategy, uint256 unlockTime);
    event StrategyUpgradeExecuted(address indexed oldStrategy, address indexed newStrategy);
    event PenaltyReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address admin_,
        address penaltyReceiver_,
        address yieldStrategy_
    )
        ERC4626(asset_)
        ERC20(name_, symbol_)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(OPERATOR_ROLE, admin_);
        penaltyReceiver = penaltyReceiver_;
        yieldStrategy = IYieldStrategy(yieldStrategy_);
    }

    // ─── Lock management ──────────────────────────────────────────────────────

    /// @notice Create a new time-locked savings position.
    /// @param amount         Principal to lock (in underlying asset decimals).
    /// @param lockDuration   Duration in seconds. Must be [7 days, 3 years].
    /// @param name           Human-readable label for this lock (UTF-8, padded to bytes32).
    function createLock(
        uint256 amount,
        uint256 lockDuration,
        bytes32 name
    ) external nonReentrant returns (uint256 lockId) {
        if (amount == 0) revert ZeroAmount();
        if (lockDuration < MIN_LOCK_DURATION || lockDuration > MAX_LOCK_DURATION) {
            revert InvalidLockDuration(lockDuration, MIN_LOCK_DURATION, MAX_LOCK_DURATION);
        }

        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);

        // Deposit into yield strategy
        IERC20(asset()).safeIncreaseAllowance(address(yieldStrategy), amount);
        yieldStrategy.deposit(asset(), amount);

        lockId = _locks[msg.sender].length;
        _locks[msg.sender].push(Lock({
            amount: amount,
            lockedUntil: block.timestamp + lockDuration,
            createdAt: block.timestamp,
            name: name,
            broken: false
        }));

        emit LockCreated(msg.sender, lockId, amount, block.timestamp + lockDuration, name);
    }

    /// @notice Add more principal to an existing lock without extending its duration.
    function topUp(uint256 lockId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Lock storage lock = _requireLock(msg.sender, lockId);
        if (lock.broken) revert LockAlreadyBroken(lockId);

        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset()).safeIncreaseAllowance(address(yieldStrategy), amount);
        yieldStrategy.deposit(asset(), amount);

        lock.amount += amount;
        emit LockToppedUp(msg.sender, lockId, amount);
    }

    /// @notice Update the display name of a lock.
    function renameLock(uint256 lockId, bytes32 newName) external {
        Lock storage lock = _requireLock(msg.sender, lockId);
        if (lock.broken) revert LockAlreadyBroken(lockId);
        lock.name = newName;
        emit LockRenamed(msg.sender, lockId, newName);
    }

    /// @notice Withdraw principal + accrued yield after maturity.
    function withdraw(uint256 lockId) external nonReentrant {
        Lock storage lock = _requireLock(msg.sender, lockId);
        if (lock.broken) revert LockAlreadyBroken(lockId);
        if (block.timestamp < lock.lockedUntil) {
            revert LockNotMatured(lockId, lock.lockedUntil, block.timestamp);
        }

        uint256 principal = lock.amount;
        lock.broken = true; // Mark consumed to prevent re-entry griefing
        lock.amount = 0;

        yieldStrategy.withdraw(asset(), principal, msg.sender);

        emit LockWithdrawn(msg.sender, lockId, principal);
    }

    /// @notice Break a lock early. Applies a 15% penalty on principal.
    ///         penalty → penaltyReceiver, remainder → caller.
    function breakLock(uint256 lockId) external nonReentrant {
        Lock storage lock = _requireLock(msg.sender, lockId);
        if (lock.broken) revert LockAlreadyBroken(lockId);
        if (block.timestamp >= lock.lockedUntil) {
            // Lock already matured — use withdraw() instead
            revert LockAlreadyMatured(lockId, lock.lockedUntil, block.timestamp);
        }

        uint256 principal = lock.amount;
        lock.broken = true;
        lock.amount = 0;

        uint256 penalty = Math.mulDiv(principal, PENALTY_BPS, BPS_DENOMINATOR);
        uint256 returned = principal - penalty;

        yieldStrategy.withdraw(asset(), principal, address(this));
        IERC20(asset()).safeTransfer(penaltyReceiver, penalty);
        IERC20(asset()).safeTransfer(msg.sender, returned);

        emit LockBroken(msg.sender, lockId, returned, penalty);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getLock(address user, uint256 lockId) external view returns (Lock memory) {
        return _requireLockView(user, lockId);
    }

    function getLocks(address user) external view returns (Lock[] memory) {
        return _locks[user];
    }

    function getLockCount(address user) external view returns (uint256) {
        return _locks[user].length;
    }

    // ─── Admin: strategy upgrade (48-hour timelock) ───────────────────────────

    /// @notice Schedule a strategy upgrade. Executable after 48 hours.
    function scheduleStrategyUpgrade(address newStrategy)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (newStrategy == address(yieldStrategy)) revert SameStrategy();
        pendingStrategy = newStrategy;
        strategyUnlockTime = block.timestamp + STRATEGY_TIMELOCK;
        emit StrategyUpgradeScheduled(newStrategy, strategyUnlockTime);
    }

    /// @notice Execute a previously scheduled strategy upgrade.
    function executeStrategyUpgrade() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pendingStrategy == address(0)) revert NoPendingUpgrade();
        if (block.timestamp < strategyUnlockTime) {
            revert StrategyTimelockActive(strategyUnlockTime);
        }
        address old = address(yieldStrategy);
        yieldStrategy = IYieldStrategy(pendingStrategy);
        pendingStrategy = address(0);
        strategyUnlockTime = 0;
        emit StrategyUpgradeExecuted(old, address(yieldStrategy));
    }

    /// @notice Update the treasury address that receives break-lock penalties.
    function setPenaltyReceiver(address newReceiver)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        emit PenaltyReceiverUpdated(penaltyReceiver, newReceiver);
        penaltyReceiver = newReceiver;
    }

    // ─── ERC-4626 overrides ───────────────────────────────────────────────────
    // Standard ERC-4626 deposit/redeem are intentionally kept accessible for
    // integrations. Lock-based savings go through createLock().

    function totalAssets() public view override returns (uint256) {
        return yieldStrategy.totalValue(asset());
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _requireLock(address user, uint256 lockId) internal view returns (Lock storage) {
        if (lockId >= _locks[user].length) revert LockDoesNotExist(lockId);
        return _locks[user][lockId];
    }

    function _requireLockView(address user, uint256 lockId) internal view returns (Lock memory) {
        if (lockId >= _locks[user].length) revert LockDoesNotExist(lockId);
        return _locks[user][lockId];
    }
}
