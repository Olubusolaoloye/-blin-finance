// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test}          from "forge-std/Test.sol";
import {ERC20Mock}     from "./mocks/ERC20Mock.sol";
import {AutoSaveVault} from "../src/AutoSaveVault.sol";
import {
    LockAlreadySettled,
    LockNotMatured,
    LockAlreadyMatured,
    InvalidLockDuration,
    ZeroAmount,
    ZeroAddress,
    Unauthorised
} from "../src/AutoSaveVault.sol";

contract AutoSaveVaultTest is Test {

    AutoSaveVault vault;
    ERC20Mock     usdc;

    address admin    = makeAddr("admin");
    address treasury = makeAddr("treasury");
    address operator = makeAddr("operator");  // simulates SaveSwap
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");

    uint256 constant USDC_UNIT = 1e6;  // USDC is 6 decimals

    function setUp() public {
        usdc = new ERC20Mock();

        vault = new AutoSaveVault(address(usdc), treasury, admin);

        // Cache role hashes before prank — vm.prank(addr) is consumed by the
        // first external call, which would be the OPERATOR_ROLE() view if
        // called inline as an argument.
        bytes32 opRole = vault.OPERATOR_ROLE();
        vm.prank(admin);
        vault.grantRole(opRole, operator);

        usdc.mint(alice, 1_000 * USDC_UNIT);
        usdc.mint(bob,   1_000 * USDC_UNIT);

        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _aliceLock(uint256 amount, uint256 duration) internal returns (uint256 lockId) {
        vm.prank(alice);
        lockId = vault.createLock(amount, duration, bytes32("lock"));
    }

    // ─── createLock ───────────────────────────────────────────────────────────

    function test_createLock_storesCorrectState() public {
        uint256 duration = 30 days;
        uint256 t0 = block.timestamp;
        uint256 lockId = _aliceLock(100 * USDC_UNIT, duration);

        AutoSaveVault.Lock memory lock = vault.getLock(lockId);
        assertEq(lock.owner,       alice,               "owner");
        assertEq(lock.principal,   100 * USDC_UNIT,     "principal");
        assertEq(lock.lockedUntil, t0 + duration,       "maturity");
        assertEq(lock.lockedAt,    t0,                  "lockedAt");
        assertEq(lock.name,        bytes32("lock"),     "name");
        assertFalse(lock.settled,                       "not settled");
        assertTrue(lock.blinReward > 0,                 "blinReward > 0");
    }

    function test_createLock_defaultRate_0point1BlinPerUsdcPerDay() public {
        // Verify rate formula: 1 USDC × 1 day → 0.1 $BLIN = 1e17 BLIN wei.
        // Use previewReward to test the math directly — createLock enforces
        // MIN_LOCK = 7 days but the rate formula itself applies to any duration.
        uint256 preview = vault.previewReward(USDC_UNIT, 1 days);
        // Allow ±1 wei rounding from mulDiv
        assertApproxEqAbs(preview, 1e17, 1, "0.1 BLIN per USDC per day");
    }

    function test_createLock_100Usdc_30Days_300Blin() public {
        // 100 USDC × 30 days → 300 $BLIN = 3e20 BLIN wei
        uint256 lockId = _aliceLock(100 * USDC_UNIT, 30 days);
        uint256 reward = vault.getLock(lockId).blinReward;
        assertApproxEqAbs(reward, 300 * 1e18, 1e6, "300 BLIN for 100 USDC 30 days");
    }

    function test_createLock_incrementsId() public {
        uint256 id0 = _aliceLock(USDC_UNIT, 7 days);
        uint256 id1 = _aliceLock(USDC_UNIT, 7 days);
        assertEq(id0, 0);
        assertEq(id1, 1);
    }

    function test_createLock_minDuration() public {
        _aliceLock(USDC_UNIT, vault.MIN_LOCK());
        assertEq(vault.getLockCount(alice), 1);
    }

    function test_createLock_maxDuration() public {
        _aliceLock(USDC_UNIT, vault.MAX_LOCK());
        assertEq(vault.getLockCount(alice), 1);
    }

    function test_createLock_revertsZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(ZeroAmount.selector);
        vault.createLock(0, 30 days, bytes32("x"));
    }

    function test_createLock_revertsDurationTooShort() public {
        uint256 bad = vault.MIN_LOCK() - 1;
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(InvalidLockDuration.selector, bad, vault.MIN_LOCK(), vault.MAX_LOCK())
        );
        vault.createLock(USDC_UNIT, bad, bytes32("x"));
    }

    function test_createLock_transfersUsdc() public {
        _aliceLock(100 * USDC_UNIT, 7 days);
        assertEq(usdc.balanceOf(address(vault)), 100 * USDC_UNIT);
        assertEq(usdc.balanceOf(alice), 900 * USDC_UNIT);
    }

    // ─── createLockFor ────────────────────────────────────────────────────────

    function test_createLockFor_operatorCanCreateForUser() public {
        uint256 amount = 50 * USDC_UNIT;
        usdc.mint(operator, amount);
        vm.prank(operator);
        usdc.transfer(address(vault), amount);

        vm.prank(operator);
        uint256 lockId = vault.createLockFor(alice, amount, 30 days, bytes32("auto"));

        assertEq(vault.getLock(lockId).owner, alice);
        assertEq(vault.getLock(lockId).principal, amount);
    }

    function test_createLockFor_revertsNonOperator() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.createLockFor(alice, USDC_UNIT, 30 days, bytes32("x"));
    }

    // ─── withdraw ─────────────────────────────────────────────────────────────

    function test_withdraw_returnsPrincipal() public {
        uint256 amount = 100 * USDC_UNIT;
        uint256 lockId = _aliceLock(amount, 7 days);

        vm.warp(block.timestamp + 7 days + 1);
        uint256 before = usdc.balanceOf(alice);

        vm.prank(alice);
        vault.withdraw(lockId);

        assertEq(usdc.balanceOf(alice) - before, amount, "USDC returned");
    }

    function test_withdraw_accumulatesClaimableBlin() public {
        uint256 amount = 100 * USDC_UNIT;
        uint256 lockId = _aliceLock(amount, 7 days);
        uint256 expectedBlin = vault.getLock(lockId).blinReward;

        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(alice);
        vault.withdraw(lockId);

        assertEq(vault.claimableBlin(alice), expectedBlin, "claimableBlin updated");
    }

    function test_withdraw_emitsBlinYieldFinalized() public {
        uint256 lockId = _aliceLock(USDC_UNIT, 7 days);
        uint256 blinReward = vault.getLock(lockId).blinReward;

        vm.warp(block.timestamp + 7 days + 1);

        vm.expectEmit(true, true, false, true);
        emit AutoSaveVault.BlinYieldFinalized(alice, lockId, blinReward, blinReward);

        vm.prank(alice);
        vault.withdraw(lockId);
    }

    function test_withdraw_noBlinTokenTransferOnBsc() public {
        // $BLIN stays on ETH — no token movement on BSC
        uint256 lockId = _aliceLock(USDC_UNIT, 7 days);
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(alice);
        vault.withdraw(lockId);
        // Nothing to assert re: BLIN token (no blinToken address on BSC vault)
        // claimableBlin is the only record
        assertTrue(vault.claimableBlin(alice) > 0, "yield recorded");
    }

    function test_withdraw_marksSettled() public {
        uint256 lockId = _aliceLock(USDC_UNIT, 7 days);
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(alice);
        vault.withdraw(lockId);

        assertTrue(vault.getLock(lockId).settled);
        assertEq(vault.getLock(lockId).principal, 0);
    }

    function test_withdraw_revertsBeforeMaturity() public {
        uint256 lockId = _aliceLock(USDC_UNIT, 30 days);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(LockNotMatured.selector, lockId, block.timestamp + 30 days, block.timestamp)
        );
        vault.withdraw(lockId);
    }

    function test_withdraw_revertsDoubleWithdraw() public {
        uint256 lockId = _aliceLock(USDC_UNIT, 7 days);
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(alice);
        vault.withdraw(lockId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LockAlreadySettled.selector, lockId));
        vault.withdraw(lockId);
    }

    function test_withdraw_multiLockAccumulatesClaimable() public {
        uint256 lockId0 = _aliceLock(100 * USDC_UNIT, 7 days);
        uint256 lockId1 = _aliceLock(200 * USDC_UNIT, 14 days);
        uint256 blin0 = vault.getLock(lockId0).blinReward;
        uint256 blin1 = vault.getLock(lockId1).blinReward;

        vm.warp(block.timestamp + 14 days + 1);
        vm.prank(alice);
        vault.withdraw(lockId0);
        vm.prank(alice);
        vault.withdraw(lockId1);

        assertEq(vault.claimableBlin(alice), blin0 + blin1, "both yields accumulated");
    }

    // ─── breakLock ────────────────────────────────────────────────────────────

    function test_breakLock_15PercentPenalty() public {
        uint256 amount = 100 * USDC_UNIT;
        uint256 lockId = _aliceLock(amount, 30 days);
        uint256 aliceBefore    = usdc.balanceOf(alice);
        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(alice);
        vault.breakLock(lockId);

        uint256 penalty  = (amount * 1_500) / 10_000;
        uint256 returned = amount - penalty;
        assertEq(usdc.balanceOf(alice)    - aliceBefore,    returned, "user USDC");
        assertEq(usdc.balanceOf(treasury) - treasuryBefore, penalty,  "treasury USDC");
    }

    function test_breakLock_forfeitsYield() public {
        _aliceLock(100 * USDC_UNIT, 30 days);
        vm.prank(alice);
        vault.breakLock(0);
        // claimableBlin should NOT increase on break
        assertEq(vault.claimableBlin(alice), 0, "yield forfeited on break");
    }

    function test_breakLock_revertsAfterMaturity() public {
        uint256 lockId      = _aliceLock(USDC_UNIT, 7 days);
        uint256 lockedUntil = block.timestamp + 7 days;
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(LockAlreadyMatured.selector, lockId, lockedUntil)
        );
        vault.breakLock(lockId);
    }

    // ─── topUp ────────────────────────────────────────────────────────────────

    function test_topUp_increasesPrincipalAndReward() public {
        uint256 lockId = _aliceLock(50 * USDC_UNIT, 30 days);
        uint256 rewardBefore = vault.getLock(lockId).blinReward;

        vm.prank(alice);
        vault.topUp(lockId, 25 * USDC_UNIT);

        assertEq(vault.getLock(lockId).principal, 75 * USDC_UNIT, "principal");
        assertTrue(vault.getLock(lockId).blinReward > rewardBefore, "reward");
    }

    // ─── previewReward ────────────────────────────────────────────────────────

    function test_previewReward_matches() public {
        uint256 preview = vault.previewReward(100 * USDC_UNIT, 30 days);
        uint256 lockId  = _aliceLock(100 * USDC_UNIT, 30 days);
        assertEq(vault.getLock(lockId).blinReward, preview);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function test_setTreasury_updatesAndRevertsZero() public {
        address newT = makeAddr("newT");
        vm.prank(admin);
        vault.setTreasury(newT);
        assertEq(vault.treasury(), newT);

        vm.prank(admin);
        vm.expectRevert(ZeroAddress.selector);
        vault.setTreasury(address(0));
    }

    // ─── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_withdraw_preservesPrincipal(uint256 amount, uint256 durationDays) public {
        amount       = bound(amount, 1, 500 * USDC_UNIT);
        durationDays = bound(durationDays, 7, 3 * 365);
        usdc.mint(alice, amount);
        uint256 lockId = _aliceLock(amount, durationDays * 1 days);
        vm.warp(block.timestamp + durationDays * 1 days + 1);
        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(lockId);
        assertEq(usdc.balanceOf(alice) - before, amount);
    }

    function testFuzz_breakLock_conservation(uint256 principal) public {
        principal = bound(principal, 1, 500 * USDC_UNIT);
        usdc.mint(alice, principal);
        uint256 lockId         = _aliceLock(principal, 30 days);
        uint256 aliceBefore    = usdc.balanceOf(alice);
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(alice);
        vault.breakLock(lockId);
        uint256 penalty  = (principal * 1_500) / 10_000;
        assertEq(usdc.balanceOf(alice)    - aliceBefore,    principal - penalty);
        assertEq(usdc.balanceOf(treasury) - treasuryBefore, penalty);
        assertEq(vault.claimableBlin(alice), 0, "no yield on break");
    }
}
