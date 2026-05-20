// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {AutoSaveVault} from "../src/AutoSaveVault.sol";

contract VaultFactoryTest is Test {
    VaultFactory factory;
    ERC20Mock    token;

    address owner    = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address aavePool = makeAddr("aavePool");
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");

    function setUp() public {
        token   = new ERC20Mock();
        factory = new VaultFactory(address(token), aavePool, treasury, owner);
    }

    // ─── getOrCreateVault ─────────────────────────────────────────────────────

    function test_getOrCreateVault_deploysVault() public {
        assertFalse(factory.hasVault(alice), "not deployed yet");

        address vault = factory.getOrCreateVault(alice);

        assertTrue(factory.hasVault(alice),               "now deployed");
        assertEq(factory.getOrCreateVault(alice), vault,  "idempotent");
        assertEq(factory.getVault(alice),         vault,  "view matches");
    }

    function test_getOrCreateVault_isIdempotent() public {
        address first  = factory.getOrCreateVault(alice);
        address second = factory.getOrCreateVault(alice);
        assertEq(first, second, "same vault on repeat call");
    }

    function test_getOrCreateVault_differentUsersGetDifferentVaults() public {
        address vaultAlice = factory.getOrCreateVault(alice);
        address vaultBob   = factory.getOrCreateVault(bob);
        assertTrue(vaultAlice != vaultBob, "vaults must differ");
    }

    function test_emitsVaultCreatedEvent() public {
        vm.expectEmit(true, false, false, false);
        emit VaultFactory.VaultCreated(alice, address(0));
        factory.getOrCreateVault(alice);
    }

    // ─── Deployed vault configuration ─────────────────────────────────────────

    function test_deployedVault_hasCorrectAdmin() public {
        address vaultAddr = factory.getOrCreateVault(alice);
        AutoSaveVault vault = AutoSaveVault(vaultAddr);
        assertTrue(
            vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), alice),
            "alice should be admin of her vault"
        );
    }

    function test_deployedVault_hasCorrectPenaltyReceiver() public {
        address vaultAddr = factory.getOrCreateVault(alice);
        AutoSaveVault vault = AutoSaveVault(vaultAddr);
        assertEq(vault.penaltyReceiver(), treasury, "penalty receiver");
    }

    function test_deployedVault_hasCorrectAsset() public {
        address vaultAddr = factory.getOrCreateVault(alice);
        AutoSaveVault vault = AutoSaveVault(vaultAddr);
        assertEq(vault.asset(), address(token), "underlying asset");
    }

    // ─── hasVault / getVault ──────────────────────────────────────────────────

    function test_hasVault_falseBeforeDeploy() public view {
        assertFalse(factory.hasVault(alice));
    }

    function test_hasVault_trueAfterDeploy() public {
        factory.getOrCreateVault(alice);
        assertTrue(factory.hasVault(alice));
    }

    function test_getVault_returnsNonZeroAfterDeploy() public {
        factory.getOrCreateVault(alice);
        assertTrue(factory.getVault(alice) != address(0));
    }

    function test_vaultIsAutoSaveVault() public {
        address vault = factory.getOrCreateVault(alice);
        AutoSaveVault v = AutoSaveVault(vault);
        assertEq(v.asset(), address(token));
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function test_setPenaltyReceiver_updatesReceiver() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(owner);
        factory.setPenaltyReceiver(newTreasury);
        assertEq(factory.penaltyReceiver(), newTreasury);
    }

    function test_setPenaltyReceiver_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.setPenaltyReceiver(alice);
    }

    // ─── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_getOrCreateVault_nonZeroAddress(address user) public {
        vm.assume(user != address(0));
        address vault = factory.getOrCreateVault(user);
        assertTrue(vault != address(0), "vault must be non-zero");
    }

    function testFuzz_uniqueVaultPerUser(address userA, address userB) public {
        vm.assume(userA != address(0) && userB != address(0) && userA != userB);
        address vA = factory.getOrCreateVault(userA);
        address vB = factory.getOrCreateVault(userB);
        assertTrue(vA != vB, "each user gets a unique vault");
    }
}
