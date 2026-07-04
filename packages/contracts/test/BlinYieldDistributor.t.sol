// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test}                  from "forge-std/Test.sol";
import {ERC20Mock}             from "./mocks/ERC20Mock.sol";
import {BlinYieldDistributor}  from "../src/BlinYieldDistributor.sol";
import {
    InvalidSignature,
    VoucherExpired,
    VoucherAlreadyUsed,
    ZeroAmount,
    ZeroAddress,
    InsufficientBlinBalance
} from "../src/BlinYieldDistributor.sol";

contract BlinYieldDistributorTest is Test {

    BlinYieldDistributor distributor;
    ERC20Mock            blin;

    // Roles
    address owner    = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address alice    = makeAddr("alice");

    // Signer key pair — Foundry's vm.sign uses uint256 private key
    uint256 constant SIGNER_PK = 0xA11CE;
    address          signer;

    uint256 constant BLIN_UNIT = 1e18; // $BLIN has 18 decimals

    function setUp() public {
        signer = vm.addr(SIGNER_PK);

        blin        = new ERC20Mock();
        distributor = new BlinYieldDistributor(address(blin), signer, owner);

        // Fund distributor with 1,000,000 $BLIN (simulates treasury deposit)
        blin.mint(address(distributor), 1_000_000 * BLIN_UNIT);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /// @dev Builds and signs an EIP-712 Claim voucher.
    function _signClaim(
        address user,
        uint256 amount,
        bytes32 nonce,
        uint256 deadline
    ) internal view returns (bytes memory sig) {
        bytes32 structHash = keccak256(
            abi.encode(distributor.CLAIM_TYPEHASH(), user, amount, nonce, deadline)
        );
        bytes32 digest = distributor.hashClaim(user, amount, nonce, deadline);

        // Sanity: our manual hash must match the contract's view function
        assertEq(digest, _hashTypedData(structHash), "digest mismatch");

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, digest);
        sig = abi.encodePacked(r, s, v);
    }

    /// @dev Re-implements EIP-712 domain separator hash for verification.
    function _hashTypedData(bytes32 structHash) internal view returns (bytes32) {
        // domain separator: name="BlinYieldDistributor", version="1", chainId, verifyingContract
        bytes32 domainSep = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("BlinYieldDistributor"),
                keccak256("1"),
                block.chainid,
                address(distributor)
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSep, structHash));
    }

    function _nonce(uint256 lockId) internal view returns (bytes32) {
        return keccak256(abi.encode(uint256(56), lockId, alice));
    }

    // ─── claim — happy path ───────────────────────────────────────────────────

    function test_claim_transfersBlin() public {
        uint256 amount   = 300 * BLIN_UNIT;
        bytes32 nonce    = _nonce(0);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signClaim(alice, amount, nonce, deadline);

        uint256 before = blin.balanceOf(alice);
        vm.prank(alice);
        distributor.claim(amount, nonce, deadline, sig);

        assertEq(blin.balanceOf(alice) - before, amount, "BLIN received");
    }

    function test_claim_updatesTotalClaimed() public {
        uint256 amount   = 100 * BLIN_UNIT;
        bytes32 nonce    = _nonce(1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signClaim(alice, amount, nonce, deadline);

        vm.prank(alice);
        distributor.claim(amount, nonce, deadline, sig);

        assertEq(distributor.totalClaimed(alice), amount);
    }

    function test_claim_marksNonceUsed() public {
        bytes32 nonce    = _nonce(2);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signClaim(alice, BLIN_UNIT, nonce, deadline);

        vm.prank(alice);
        distributor.claim(BLIN_UNIT, nonce, deadline, sig);

        assertTrue(distributor.usedNonces(nonce));
    }

    function test_claim_emitsBlinClaimed() public {
        uint256 amount   = 50 * BLIN_UNIT;
        bytes32 nonce    = _nonce(3);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signClaim(alice, amount, nonce, deadline);

        vm.expectEmit(true, true, false, true);
        emit BlinYieldDistributor.BlinClaimed(alice, amount, nonce);

        vm.prank(alice);
        distributor.claim(amount, nonce, deadline, sig);
    }

    function test_claim_reducesReserve() public {
        uint256 reserveBefore = distributor.blinReserve();
        uint256 amount        = 200 * BLIN_UNIT;
        bytes32 nonce         = _nonce(4);
        uint256 deadline      = block.timestamp + 1 hours;
        bytes memory sig      = _signClaim(alice, amount, nonce, deadline);

        vm.prank(alice);
        distributor.claim(amount, nonce, deadline, sig);

        assertEq(distributor.blinReserve(), reserveBefore - amount);
    }

    // ─── claim — reverts ──────────────────────────────────────────────────────

    function test_claim_revertsZeroAmount() public {
        bytes32 nonce    = _nonce(5);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signClaim(alice, 0, nonce, deadline);

        vm.prank(alice);
        vm.expectRevert(ZeroAmount.selector);
        distributor.claim(0, nonce, deadline, sig);
    }

    function test_claim_revertsExpiredDeadline() public {
        vm.warp(1_000);
        uint256 amount   = BLIN_UNIT;
        bytes32 nonce    = _nonce(6);
        uint256 deadline = block.timestamp - 1;
        bytes memory sig = _signClaim(alice, amount, nonce, deadline);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(VoucherExpired.selector, deadline, block.timestamp));
        distributor.claim(amount, nonce, deadline, sig);
    }

    function test_claim_revertsReplayedNonce() public {
        bytes32 nonce    = _nonce(7);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signClaim(alice, BLIN_UNIT, nonce, deadline);

        vm.prank(alice);
        distributor.claim(BLIN_UNIT, nonce, deadline, sig);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(VoucherAlreadyUsed.selector, nonce));
        distributor.claim(BLIN_UNIT, nonce, deadline, sig);
    }

    function test_claim_revertsWrongSigner() public {
        uint256 amount   = BLIN_UNIT;
        bytes32 nonce    = _nonce(8);
        uint256 deadline = block.timestamp + 1 hours;

        // Sign with a different private key
        uint256 wrongPk   = 0xBAD;
        bytes32 digest    = distributor.hashClaim(alice, amount, nonce, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPk, digest);
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.prank(alice);
        vm.expectRevert(InvalidSignature.selector);
        distributor.claim(amount, nonce, deadline, badSig);
    }

    function test_claim_revertsWrongUser() public {
        // Voucher signed for alice but submitted by bob
        address bob    = makeAddr("bob");
        uint256 amount   = BLIN_UNIT;
        bytes32 nonce    = _nonce(9);
        uint256 deadline = block.timestamp + 1 hours;

        // Sign a voucher for alice
        bytes memory sig = _signClaim(alice, amount, nonce, deadline);

        // Bob submits alice's voucher — EIP-712 uses msg.sender so sig won't verify
        vm.prank(bob);
        vm.expectRevert(InvalidSignature.selector);
        distributor.claim(amount, nonce, deadline, sig);
    }

    function test_claim_revertsInsufficientReserve() public {
        // Drain the distributor
        uint256 reserve = distributor.blinReserve();
        vm.prank(owner);
        distributor.withdrawFunds(treasury, reserve);

        bytes32 nonce    = _nonce(10);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signClaim(alice, BLIN_UNIT, nonce, deadline);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(InsufficientBlinBalance.selector, BLIN_UNIT, 0)
        );
        distributor.claim(BLIN_UNIT, nonce, deadline, sig);
    }

    // ─── Multi-lock accumulation ──────────────────────────────────────────────

    function test_claim_multipleLocksSameSigner() public {
        uint256 deadline = block.timestamp + 1 hours;

        // Claim for lock 0
        bytes32 n0  = _nonce(0);
        bytes memory s0 = _signClaim(alice, 100 * BLIN_UNIT, n0, deadline);
        vm.prank(alice);
        distributor.claim(100 * BLIN_UNIT, n0, deadline, s0);

        // Claim for lock 1
        bytes32 n1  = _nonce(1);
        bytes memory s1 = _signClaim(alice, 200 * BLIN_UNIT, n1, deadline);
        vm.prank(alice);
        distributor.claim(200 * BLIN_UNIT, n1, deadline, s1);

        assertEq(distributor.totalClaimed(alice), 300 * BLIN_UNIT);
        assertEq(blin.balanceOf(alice), 300 * BLIN_UNIT);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function test_setSigner_updatesAndRevertsZero() public {
        address newSigner = makeAddr("newSigner");
        vm.prank(owner);
        distributor.setSigner(newSigner);
        assertEq(distributor.signer(), newSigner);

        vm.prank(owner);
        vm.expectRevert(ZeroAddress.selector);
        distributor.setSigner(address(0));
    }

    function test_setSigner_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        distributor.setSigner(alice);
    }

    function test_withdrawFunds_ownerCanDrain() public {
        uint256 reserve = distributor.blinReserve();
        vm.prank(owner);
        distributor.withdrawFunds(treasury, reserve);
        assertEq(blin.balanceOf(treasury), reserve);
        assertEq(distributor.blinReserve(), 0);
    }

    function test_withdrawFunds_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        distributor.withdrawFunds(alice, BLIN_UNIT);
    }

    // ─── hashClaim view ───────────────────────────────────────────────────────

    function test_hashClaim_isDeterministic() public view {
        bytes32 h1 = distributor.hashClaim(alice, BLIN_UNIT, _nonce(0), block.timestamp + 1 hours);
        bytes32 h2 = distributor.hashClaim(alice, BLIN_UNIT, _nonce(0), block.timestamp + 1 hours);
        assertEq(h1, h2);
    }

    function test_hashClaim_differsAcrossParams() public view {
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 h1 = distributor.hashClaim(alice, BLIN_UNIT,     _nonce(0), deadline);
        bytes32 h2 = distributor.hashClaim(alice, BLIN_UNIT * 2, _nonce(0), deadline);
        bytes32 h3 = distributor.hashClaim(alice, BLIN_UNIT,     _nonce(1), deadline);
        assertTrue(h1 != h2, "different amounts");
        assertTrue(h1 != h3, "different nonces");
    }

    // ─── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_claim_conservation(uint256 amount) public {
        amount = bound(amount, 1, 1_000_000 * BLIN_UNIT);

        // Ensure distributor has enough
        blin.mint(address(distributor), amount);

        bytes32 nonce    = keccak256(abi.encode(amount));
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signClaim(alice, amount, nonce, deadline);

        uint256 reserveBefore = distributor.blinReserve();
        uint256 aliceBefore   = blin.balanceOf(alice);

        vm.prank(alice);
        distributor.claim(amount, nonce, deadline, sig);

        assertEq(blin.balanceOf(alice)         - aliceBefore,   amount);
        assertEq(distributor.blinReserve(),      reserveBefore - amount);
        assertEq(distributor.totalClaimed(alice), amount);
    }
}
