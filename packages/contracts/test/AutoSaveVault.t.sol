// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AutoSaveVault} from "../src/AutoSaveVault.sol";
import {IYieldStrategy} from "../src/interfaces/IYieldStrategy.sol";
import {
    LockNotMatured,
    LockAlreadyMatured,
    LockDoesNotExist,
    InvalidLockDuration,
    LockAlreadyBroken,
    ZeroAmount,
    StrategyTimelockActive,
    NoPendingUpgrade,
    SameStrategy
} from "../src/AutoSaveVault.sol";

/// @notice Stub strategy that holds tokens in-contract (no external yield).
contract NoopStrategy is IYieldStrategy {
    function deposit(address asset, uint256 amount) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(address asset, uint256 amount, address recipient) external {
        IERC20(asset).transfer(recipient, amount);
    }

    function totalValue(address asset) external view returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }

    function currentApyBps(address) external pure returns (uint256) { return 0; }
}

/// @notice Alternative strategy used for upgrade tests.
contract AltStrategy is IYieldStrategy {
    function deposit(address asset, uint256 amount) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
    }
    function withdraw(address asset, uint256 amount, address recipient) external {
        IERC20(asset).transfer(recipient, amount);
    }
    function totalValue(address asset) external view returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }
    function currentApyBps(address) external pure returns (uint256) { return 100; }
}

contract AutoSaveVaultTest is Test {
    AutoSaveVault vault;
    ERC20Mock token;
    NoopStrategy strategy;

    address admin    = makeAddr("admin");
    address treasury = makeAddr("treasury");
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");

    uint256 constant ONE = 1e18;

    function setUp() public {
        token    = new ERC20Mock();
        strategy = new NoopStrategy();

        vault = new AutoSaveVault(
            token,
            "Blin Save TEST",
            "bsTEST",
            admin,
            treasury,
            address(strategy)
        );

        token.mint(alice, 1_000 * ONE);
        token.mint(bob,   1_000 * ONE);
        vm.prank(alice);
        token.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        token.approve(address(vault), type(uint256).max);
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    function _aliceLock(uint256 amount, uint256 duration) internal returns (uint256 lockId) {
        vm.prank(alice);
        lockId = vault.createLock(amount, duration, bytes32("lock"));
    }

    // ─── createLock ───────────────────────────────────────────────────────────

    function test_createLock_storesCorrectState() public {
        uint256 duration = 30 days;
        uint256 t0 = block.timestamp;
        uint256 lockId = _aliceLock(100 * ONE, duration);

        AutoSaveVault.Lock memory lock = vault.getLock(alice, lockId);
        assertEq(lock.amount,      100 * ONE,        "principal");
        assertEq(lock.lockedUntil, t0 + duration,    "maturity");
        assertEq(lock.createdAt,   t0,               "createdAt");
        assertEq(lock.name,        bytes32("lock"),  "name");
        assertFalse(lock.broken,                     "broken");
    }

    function test_createLock_incrementsLockId() public {
        uint256 id0 = _aliceLock(ONE, 7 days);
        uint256 id1 = _aliceLock(ONE, 7 days);
        assertEq(id0, 0, "first id");
        assertEq(id1, 1, "second id");
        assertEq(vault.getLockCount(alice), 2, "count");
    }

    function test_createLock_minDurationAccepted() public {
        _aliceLock(ONE, vault.MIN_LOCK_DURATION());
        assertEq(vault.getLockCount(alice), 1);
    }

    function test_createLock_maxDurationAccepted() public {
        _aliceLock(ONE, vault.MAX_LOCK_DURATION());
        assertEq(vault.getLockCount(alice), 1);
    }

    function test_createLock_revertsZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(ZeroAmount.selector);
        vault.createLock(0, 30 days, bytes32("x"));
    }

    function test_createLock_revertsDurationTooShort() public {
        uint256 bad = vault.MIN_LOCK_DURATION() - 1;
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(InvalidLockDuration.selector, bad, vault.MIN_LOCK_DURATION(), vault.MAX_LOCK_DURATION())
        );
        vault.createLock(ONE, bad, bytes32("x"));
    }

    function test_createLock_revertsDurationTooLong() public {
        uint256 bad = vault.MAX_LOCK_DURATION() + 1;
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(InvalidLockDuration.selector, bad, vault.MIN_LOCK_DURATION(), vault.MAX_LOCK_DURATION())
        );
        vault.createLock(ONE, bad, bytes32("x"));
    }

    function test_createLock_transfersTokensToStrategy() public {
        uint256 amount = 100 * ONE;
        _aliceLock(amount, 7 days);
        assertEq(token.balanceOf(address(strategy)), amount, "strategy balance");
        assertEq(token.balanceOf(alice), 900 * ONE, "alice balance reduced");
    }

    // ─── withdraw ─────────────────────────────────────────────────────────────

    function test_withdraw_returnsFullPrincipal() public {
        uint256 principal = 100 * ONE;
        uint256 lockId    = _aliceLock(principal, 7 days);

        vm.warp(block.timestamp + 7 days + 1);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(lockId);

        assertEq(token.balanceOf(alice) - before, principal, "withdrawal amount");
    }

    function test_withdraw_marksLockBroken() public {
        uint256 lockId = _aliceLock(ONE, 7 days);
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(alice);
        vault.withdraw(lockId);

        AutoSaveVault.Lock memory lock = vault.getLock(alice, lockId);
        assertTrue(lock.broken,    "should be broken");
        assertEq(lock.amount, 0,   "amount zeroed");
    }

    function test_withdraw_revertsBeforeMaturity() public {
        uint256 lockId = _aliceLock(ONE, 30 days);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(LockNotMatured.selector, lockId, block.timestamp + 30 days, block.timestamp)
        );
        vault.withdraw(lockId);
    }

    function test_withdraw_revertsOnBrokenLock() public {
        uint256 lockId = _aliceLock(ONE, 30 days);
        vm.prank(alice);
        vault.breakLock(lockId);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LockAlreadyBroken.selector, lockId));
        vault.withdraw(lockId);
    }

    function test_withdraw_revertsOnNonexistentLock() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LockDoesNotExist.selector, 99));
        vault.withdraw(99);
    }

    // ─── breakLock ────────────────────────────────────────────────────────────

    function test_breakLock_applies15PercentPenalty() public {
        uint256 principal = 100 * ONE;
        uint256 lockId    = _aliceLock(principal, 30 days);

        uint256 aliceBefore   = token.balanceOf(alice);
        uint256 treasuryBefore = token.balanceOf(treasury);

        vm.prank(alice);
        vault.breakLock(lockId);

        uint256 penalty  = (principal * 1500) / 10_000;
        uint256 returned = principal - penalty;

        assertEq(token.balanceOf(alice)    - aliceBefore,    returned, "user amount");
        assertEq(token.balanceOf(treasury) - treasuryBefore, penalty,  "treasury amount");
    }

    function test_breakLock_revertsAfterMaturity() public {
        uint256 lockId     = _aliceLock(ONE, 7 days);
        uint256 lockedUntil = block.timestamp + 7 days;
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(LockAlreadyMatured.selector, lockId, lockedUntil, block.timestamp)
        );
        vault.breakLock(lockId);
    }

    function test_breakLock_revertsOnAlreadyBroken() public {
        uint256 lockId = _aliceLock(ONE, 30 days);
        vm.prank(alice);
        vault.breakLock(lockId);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LockAlreadyBroken.selector, lockId));
        vault.breakLock(lockId);
    }

    function test_breakLock_revertsOnNonexistentLock() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LockDoesNotExist.selector, 5));
        vault.breakLock(5);
    }

    function test_breakLock_penaltyMathExact() public {
        // 1 wei principal → penalty rounds down, user gets remainder
        uint256 lockId = _aliceLock(1, 30 days);
        uint256 aliceBefore = token.balanceOf(alice);
        vm.prank(alice);
        vault.breakLock(lockId);
        // penalty = mulDiv(1, 1500, 10000) = 0 (rounds down)
        // returned = 1 - 0 = 1
        assertEq(token.balanceOf(alice) - aliceBefore, 1, "1 wei: user gets all");
    }

    // ─── topUp ────────────────────────────────────────────────────────────────

    function test_topUp_increasesAmount() public {
        uint256 lockId = _aliceLock(50 * ONE, 30 days);
        vm.prank(alice);
        vault.topUp(lockId, 25 * ONE);

        AutoSaveVault.Lock memory lock = vault.getLock(alice, lockId);
        assertEq(lock.amount, 75 * ONE, "amount after top-up");
    }

    function test_topUp_revertsZeroAmount() public {
        uint256 lockId = _aliceLock(ONE, 30 days);
        vm.prank(alice);
        vm.expectRevert(ZeroAmount.selector);
        vault.topUp(lockId, 0);
    }

    function test_topUp_revertsOnBrokenLock() public {
        uint256 lockId = _aliceLock(ONE, 30 days);
        vm.prank(alice);
        vault.breakLock(lockId);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LockAlreadyBroken.selector, lockId));
        vault.topUp(lockId, ONE);
    }

    // ─── renameLock ───────────────────────────────────────────────────────────

    function test_renameLock_updatesName() public {
        uint256 lockId = _aliceLock(ONE, 7 days);
        vm.prank(alice);
        vault.renameLock(lockId, bytes32("new-name"));
        assertEq(vault.getLock(alice, lockId).name, bytes32("new-name"));
    }

    function test_renameLock_revertsOnBrokenLock() public {
        uint256 lockId = _aliceLock(ONE, 30 days);
        vm.prank(alice);
        vault.breakLock(lockId);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LockAlreadyBroken.selector, lockId));
        vault.renameLock(lockId, bytes32("x"));
    }

    // ─── getLocks / getLockCount ──────────────────────────────────────────────

    function test_getLocks_returnsAll() public {
        _aliceLock(ONE, 7 days);
        _aliceLock(2 * ONE, 14 days);
        AutoSaveVault.Lock[] memory locks = vault.getLocks(alice);
        assertEq(locks.length, 2);
        assertEq(locks[0].amount, ONE);
        assertEq(locks[1].amount, 2 * ONE);
    }

    function test_getLock_revertsOnInvalidId() public {
        vm.expectRevert(abi.encodeWithSelector(LockDoesNotExist.selector, 0));
        vault.getLock(alice, 0);
    }

    // ─── Strategy upgrade ─────────────────────────────────────────────────────

    function test_scheduleStrategyUpgrade_setsState() public {
        AltStrategy alt = new AltStrategy();
        vm.prank(admin);
        vault.scheduleStrategyUpgrade(address(alt));

        assertEq(vault.pendingStrategy(),   address(alt));
        assertEq(vault.strategyUnlockTime(), block.timestamp + 48 hours);
    }

    function test_scheduleStrategyUpgrade_revertsSameStrategy() public {
        vm.prank(admin);
        vm.expectRevert(SameStrategy.selector);
        vault.scheduleStrategyUpgrade(address(strategy));
    }

    function test_executeStrategyUpgrade_revertsNoPending() public {
        vm.prank(admin);
        vm.expectRevert(NoPendingUpgrade.selector);
        vault.executeStrategyUpgrade();
    }

    function test_executeStrategyUpgrade_revertsBeforeTimelock() public {
        AltStrategy alt = new AltStrategy();
        vm.prank(admin);
        vault.scheduleStrategyUpgrade(address(alt));

        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(StrategyTimelockActive.selector, block.timestamp + 48 hours)
        );
        vault.executeStrategyUpgrade();
    }

    function test_executeStrategyUpgrade_succeedsAfterTimelock() public {
        AltStrategy alt = new AltStrategy();
        vm.prank(admin);
        vault.scheduleStrategyUpgrade(address(alt));

        vm.warp(block.timestamp + 48 hours + 1);
        vm.prank(admin);
        vault.executeStrategyUpgrade();

        assertEq(address(vault.yieldStrategy()), address(alt), "strategy updated");
        assertEq(vault.pendingStrategy(),        address(0),   "pending cleared");
        assertEq(vault.strategyUnlockTime(),     0,            "unlockTime cleared");
    }

    // ─── Access control ───────────────────────────────────────────────────────

    function test_scheduleStrategyUpgrade_revertsNonAdmin() public {
        AltStrategy alt = new AltStrategy();
        vm.prank(alice);
        vm.expectRevert();
        vault.scheduleStrategyUpgrade(address(alt));
    }

    function test_executeStrategyUpgrade_revertsNonAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.executeStrategyUpgrade();
    }

    function test_setPenaltyReceiver_revertsNonAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setPenaltyReceiver(alice);
    }

    function test_setPenaltyReceiver_updatesTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(admin);
        vault.setPenaltyReceiver(newTreasury);
        assertEq(vault.penaltyReceiver(), newTreasury);
    }

    // ─── Isolation between users ──────────────────────────────────────────────

    function test_locksAreIsolatedPerUser() public {
        _aliceLock(100 * ONE, 30 days);
        vm.prank(bob);
        vault.createLock(200 * ONE, 7 days, bytes32("bob"));

        assertEq(vault.getLockCount(alice), 1);
        assertEq(vault.getLockCount(bob),   1);
        assertEq(vault.getLock(alice, 0).amount, 100 * ONE);
        assertEq(vault.getLock(bob,   0).amount, 200 * ONE);
    }

    // ─── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_createLock_withdraw_preservesPrincipal(
        uint256 amount,
        uint256 durationDays
    ) public {
        amount       = bound(amount, 1, 500 * ONE);
        durationDays = bound(durationDays, 7, 3 * 365);

        token.mint(alice, amount);
        uint256 lockId = _aliceLock(amount, durationDays * 1 days);

        vm.warp(block.timestamp + durationDays * 1 days + 1);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(lockId);
        assertEq(token.balanceOf(alice) - before, amount, "principal not preserved");
    }

    function testFuzz_breakLock_penaltyMath(uint256 principal) public {
        principal = bound(principal, 1, 500 * ONE);
        token.mint(alice, principal);

        uint256 lockId        = _aliceLock(principal, 30 days);
        uint256 aliceBefore   = token.balanceOf(alice);
        uint256 treasuryBefore = token.balanceOf(treasury);

        vm.prank(alice);
        vault.breakLock(lockId);

        uint256 penalty  = (principal * 1500) / 10_000;
        uint256 returned = principal - penalty;

        assertEq(token.balanceOf(alice)    - aliceBefore,    returned, "user");
        assertEq(token.balanceOf(treasury) - treasuryBefore, penalty,  "treasury");
        assertEq(returned + penalty, principal, "conservation");
    }

    function testFuzz_noDoubleWithdraw(uint256 duration) public {
        duration = bound(duration, 7 days, vault.MAX_LOCK_DURATION());
        uint256 lockId = _aliceLock(ONE, duration);
        vm.warp(block.timestamp + duration + 1);
        vm.prank(alice);
        vault.withdraw(lockId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LockAlreadyBroken.selector, lockId));
        vault.withdraw(lockId);
    }
}
