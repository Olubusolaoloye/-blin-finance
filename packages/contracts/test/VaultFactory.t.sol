// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test}          from "forge-std/Test.sol";
import {ERC20Mock}     from "./mocks/ERC20Mock.sol";
import {VaultFactory}  from "../src/VaultFactory.sol";
import {AutoSaveVault} from "../src/AutoSaveVault.sol";

contract VaultFactoryTest is Test {

    ERC20Mock    usdc;
    VaultFactory factory;

    address owner    = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address saveSwap = makeAddr("saveSwap");
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");

    function setUp() public {
        usdc    = new ERC20Mock();
        factory = new VaultFactory(address(usdc), treasury, saveSwap, owner);
    }

    // ─── getOrCreateVault ─────────────────────────────────────────────────────

    function test_deploysVault() public {
        assertFalse(factory.hasVault(alice));
        address vault = factory.getOrCreateVault(alice);
        assertTrue(factory.hasVault(alice));
        assertEq(factory.getOrCreateVault(alice), vault, "idempotent");
        assertEq(factory.getVault(alice), vault);
    }

    function test_isIdempotent() public {
        assertEq(factory.getOrCreateVault(alice), factory.getOrCreateVault(alice));
    }

    function test_differentUsersGetDifferentVaults() public {
        assertTrue(factory.getOrCreateVault(alice) != factory.getOrCreateVault(bob));
    }

    function test_emitsVaultCreatedEvent() public {
        vm.expectEmit(true, false, false, false);
        emit VaultFactory.VaultCreated(alice, address(0));
        factory.getOrCreateVault(alice);
    }

    // ─── Role wiring ──────────────────────────────────────────────────────────

    function test_userIsAdmin() public {
        AutoSaveVault vault = AutoSaveVault(factory.getOrCreateVault(alice));
        assertTrue(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), alice), "alice is admin");
    }

    function test_saveSwapHasOperatorRole() public {
        AutoSaveVault vault = AutoSaveVault(factory.getOrCreateVault(alice));
        assertTrue(vault.hasRole(vault.OPERATOR_ROLE(), saveSwap), "saveSwap has OPERATOR_ROLE");
    }

    function test_factoryNoLongerAdmin() public {
        AutoSaveVault vault = AutoSaveVault(factory.getOrCreateVault(alice));
        assertFalse(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), address(factory)));
    }

    function test_factoryNoLongerOperator() public {
        AutoSaveVault vault = AutoSaveVault(factory.getOrCreateVault(alice));
        assertFalse(vault.hasRole(vault.OPERATOR_ROLE(), address(factory)));
    }

    function test_vaultHasCorrectUsdc() public {
        AutoSaveVault vault = AutoSaveVault(factory.getOrCreateVault(alice));
        assertEq(address(vault.usdc()), address(usdc));
    }

    function test_vaultHasCorrectTreasury() public {
        AutoSaveVault vault = AutoSaveVault(factory.getOrCreateVault(alice));
        assertEq(vault.treasury(), treasury);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function test_setTreasury() public {
        address newT = makeAddr("newT");
        vm.prank(owner);
        factory.setTreasury(newT);
        assertEq(factory.treasury(), newT);
    }

    function test_setTreasury_revertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        factory.setTreasury(address(0));
    }

    function test_setTreasury_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.setTreasury(makeAddr("x"));
    }

    function test_setSaveSwap() public {
        address newSwap = makeAddr("newSwap");
        vm.prank(owner);
        factory.setSaveSwap(newSwap);
        assertEq(factory.saveSwap(), newSwap);
    }

    // ─── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_uniqueVaultPerUser(address userA, address userB) public {
        vm.assume(userA != address(0) && userB != address(0) && userA != userB);
        assertTrue(factory.getOrCreateVault(userA) != factory.getOrCreateVault(userB));
    }

    function testFuzz_vaultNonZero(address user) public {
        vm.assume(user != address(0));
        assertTrue(factory.getOrCreateVault(user) != address(0));
    }
}
