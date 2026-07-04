// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20}         from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20}      from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl}  from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math}           from "@openzeppelin/contracts/utils/math/Math.sol";

// ─── Custom errors ────────────────────────────────────────────────────────────

error LockDoesNotExist(uint256 lockId);
error LockAlreadySettled(uint256 lockId);
error LockNotMatured(uint256 lockId, uint256 maturesAt, uint256 now_);
error LockAlreadyMatured(uint256 lockId, uint256 maturedAt);
error InvalidLockDuration(uint256 duration, uint256 min, uint256 max);
error ZeroAmount();
error ZeroAddress();
error Unauthorised(address caller);

/// @title AutoSaveVault  (BSC)
/// @notice USDC savings vault with time-locked positions.
///
///         $BLIN yield is tracked on-chain as an accumulating number — no token
///         transfer happens on BSC. When a user wants to collect their $BLIN they
///         call the BlinYieldDistributor contract on Ethereum, which holds the
///         real $BLIN supply (0xaEFB54306240502c5421Be478fa16aACfA9698A2) and
///         pays out based on a backend-issued EIP-712 voucher.
///
///         Yield rate: 0.1 $BLIN per USDC per day.
///           blinEarned = lockedUSDC_wei × lockDuration_secs × rewardRate / 1e18
///
///         Breaking early forfeits ALL $BLIN yield and incurs a 15% USDC penalty.
///
///         SaveSwap calls createLockFor() to create auto-save locks on behalf of
///         users after depositing USDC directly into this contract.
contract AutoSaveVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ─── Roles ────────────────────────────────────────────────────────────────

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MIN_LOCK = 7 days;
    uint256 public constant MAX_LOCK = 3 * 365 days;

    uint256 public constant PENALTY_BPS     = 1_500;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @dev Precision denominator used in reward formula.
    uint256 public constant REWARD_PRECISION = 1e18;

    // ─── Immutables ───────────────────────────────────────────────────────────

    /// @notice USDC on BSC (6 decimals).
    ///         0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
    IERC20 public immutable usdc;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice $BLIN per (USDC-wei × second). Adjustable by admin.
    ///
    ///         Default: 0.1 $BLIN per 1 USDC per day.
    ///           1 USDC = 1e6 wei  |  1 day = 86_400 s  |  0.1 $BLIN = 1e17 BLIN-wei
    ///           rate = 1e17 × 1e18 / (1e6 × 86_400) = 1e35 / 86_400_000_000
    ///                ≈ 1_157_407_407_407_407_407_407_407
    ///
    ///         Verification: 1e6 × 86400 × rate / 1e18 = 1e17 = 0.1 $BLIN ✓
    uint256 public rewardRate;

    /// @notice Treasury receives early-exit USDC penalties.
    address public treasury;

    // ─── Lock storage ─────────────────────────────────────────────────────────

    struct Lock {
        uint256 id;
        address owner;
        uint256 principal;     // USDC wei locked
        uint256 lockedAt;
        uint256 lockedUntil;
        uint256 blinReward;    // $BLIN wei earned on matured withdrawal (display only — paid on ETH)
        bytes32 name;
        bool    settled;
    }

    uint256 public nextLockId;

    mapping(uint256 => Lock)      private _locks;
    mapping(address => uint256[]) private _userLocks;

    /// @notice Total USDC currently locked across all active positions.
    uint256 public totalLocked;

    /// @notice Accumulated $BLIN yield per user from matured USDC withdrawals.
    ///         This is the authoritative on-chain record the backend reads to
    ///         issue claim vouchers on Ethereum.
    ///         Increases on each matured withdrawal; never decreases.
    mapping(address => uint256) public claimableBlin;

    // ─── Events ───────────────────────────────────────────────────────────────

    event LockCreated(
        address indexed owner,
        uint256 indexed lockId,
        uint256 principal,
        uint256 lockedUntil,
        uint256 blinReward,
        bytes32 name
    );
    event LockToppedUp(
        address indexed owner,
        uint256 indexed lockId,
        uint256 added,
        uint256 newPrincipal,
        uint256 newBlinReward
    );
    event LockWithdrawn(
        address indexed owner,
        uint256 indexed lockId,
        uint256 principal
    );
    /// @notice Emitted when a matured lock is settled.
    ///         The backend listens for this event to issue a $BLIN claim voucher
    ///         on Ethereum via BlinYieldDistributor.
    event BlinYieldFinalized(
        address indexed user,
        uint256 indexed lockId,
        uint256 blinAmount,          // $BLIN wei earned on this lock
        uint256 totalClaimable       // user's running total claimable $BLIN
    );
    event LockBroken(
        address indexed owner,
        uint256 indexed lockId,
        uint256 returned,
        uint256 penalty
    );
    event LockRenamed(address indexed owner, uint256 indexed lockId, bytes32 newName);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address usdc_,
        address treasury_,
        address admin_
    ) {
        if (usdc_ == address(0) || treasury_ == address(0) || admin_ == address(0))
            revert ZeroAddress();

        usdc     = IERC20(usdc_);
        treasury = treasury_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(OPERATOR_ROLE,      admin_);

        // 0.1 $BLIN per 1 USDC per day
        rewardRate = 1_157_407_407_407_407_407_407_407;
    }

    // ─── Lock creation ────────────────────────────────────────────────────────

    function createLock(
        uint256 amount,
        uint256 duration,
        bytes32 name
    ) external nonReentrant returns (uint256 lockId) {
        _validateLock(amount, duration);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        lockId = _createLock(msg.sender, amount, duration, name);
    }

    /// @notice Called by SaveSwap (OPERATOR_ROLE). USDC must already be in this
    ///         contract before this is called — no safeTransferFrom is performed.
    function createLockFor(
        address user,
        uint256 amount,
        uint256 duration,
        bytes32 name
    ) external nonReentrant onlyRole(OPERATOR_ROLE) returns (uint256 lockId) {
        if (user == address(0)) revert ZeroAddress();
        _validateLock(amount, duration);
        lockId = _createLock(user, amount, duration, name);
    }

    // ─── Lock management ──────────────────────────────────────────────────────

    function topUp(uint256 lockId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Lock storage lock = _requireOwned(msg.sender, lockId);
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        uint256 remaining = lock.lockedUntil > block.timestamp
            ? lock.lockedUntil - block.timestamp
            : 0;
        uint256 addedReward = _calcReward(amount, remaining);

        lock.principal  += amount;
        lock.blinReward += addedReward;
        totalLocked     += amount;

        emit LockToppedUp(msg.sender, lockId, amount, lock.principal, lock.blinReward);
    }

    function renameLock(uint256 lockId, bytes32 newName) external {
        Lock storage lock = _requireOwned(msg.sender, lockId);
        lock.name = newName;
        emit LockRenamed(msg.sender, lockId, newName);
    }

    /// @notice Withdraw USDC principal after lock matures.
    ///         $BLIN yield is finalised here and added to claimableBlin[user].
    ///         The user can then claim $BLIN on Ethereum via BlinYieldDistributor.
    function withdraw(uint256 lockId) external nonReentrant {
        Lock storage lock = _requireOwned(msg.sender, lockId);
        if (block.timestamp < lock.lockedUntil) {
            revert LockNotMatured(lockId, lock.lockedUntil, block.timestamp);
        }

        uint256 principal  = lock.principal;
        uint256 blinReward = lock.blinReward;

        _settle(lock);
        totalLocked -= principal;

        // Return USDC
        usdc.safeTransfer(msg.sender, principal);

        // Finalise $BLIN yield (no token transfer — paid on Ethereum)
        claimableBlin[msg.sender] += blinReward;

        emit LockWithdrawn(msg.sender, lockId, principal);
        emit BlinYieldFinalized(msg.sender, lockId, blinReward, claimableBlin[msg.sender]);
    }

    /// @notice Break a lock early. Forfeits ALL $BLIN yield. 15% USDC penalty.
    function breakLock(uint256 lockId) external nonReentrant {
        Lock storage lock = _requireOwned(msg.sender, lockId);
        if (block.timestamp >= lock.lockedUntil) {
            revert LockAlreadyMatured(lockId, lock.lockedUntil);
        }

        uint256 principal = lock.principal;
        uint256 penalty   = Math.mulDiv(principal, PENALTY_BPS, BPS_DENOMINATOR);
        uint256 returned  = principal - penalty;

        _settle(lock);
        totalLocked -= principal;

        // $BLIN yield is forfeited — claimableBlin[msg.sender] unchanged
        usdc.safeTransfer(treasury,   penalty);
        usdc.safeTransfer(msg.sender, returned);

        emit LockBroken(msg.sender, lockId, returned, penalty);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getLock(uint256 lockId) external view returns (Lock memory) {
        return _locks[lockId];
    }

    function getUserLocks(address user) external view returns (Lock[] memory locks) {
        uint256[] storage ids = _userLocks[user];
        locks = new Lock[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            locks[i] = _locks[ids[i]];
        }
    }

    function getLockCount(address user) external view returns (uint256) {
        return _userLocks[user].length;
    }

    /// @notice Preview $BLIN yield for a given amount and duration.
    function previewReward(uint256 amount, uint256 duration) external view returns (uint256) {
        return _calcReward(amount, duration);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setRewardRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RewardRateUpdated(rewardRate, newRate);
        rewardRate = newRate;
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _validateLock(uint256 amount, uint256 duration) internal pure {
        if (amount == 0) revert ZeroAmount();
        if (duration < MIN_LOCK || duration > MAX_LOCK)
            revert InvalidLockDuration(duration, MIN_LOCK, MAX_LOCK);
    }

    function _createLock(
        address owner,
        uint256 amount,
        uint256 duration,
        bytes32 name
    ) internal returns (uint256 lockId) {
        lockId = nextLockId++;
        uint256 maturity   = block.timestamp + duration;
        uint256 blinReward = _calcReward(amount, duration);

        _locks[lockId] = Lock({
            id:          lockId,
            owner:       owner,
            principal:   amount,
            lockedAt:    block.timestamp,
            lockedUntil: maturity,
            blinReward:  blinReward,
            name:        name,
            settled:     false
        });
        _userLocks[owner].push(lockId);
        totalLocked += amount;

        emit LockCreated(owner, lockId, amount, maturity, blinReward, name);
    }

    function _calcReward(uint256 amount, uint256 duration) internal view returns (uint256) {
        return Math.mulDiv(amount * duration, rewardRate, REWARD_PRECISION);
    }

    function _requireOwned(address user, uint256 lockId) internal view returns (Lock storage lock) {
        lock = _locks[lockId];
        if (lock.owner != user) revert Unauthorised(user);
        if (lock.settled)       revert LockAlreadySettled(lockId);
    }

    function _settle(Lock storage lock) internal {
        lock.settled    = true;
        lock.principal  = 0;
        lock.blinReward = 0;
    }
}
