// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test}              from "forge-std/Test.sol";
import {ERC20Mock}         from "./mocks/ERC20Mock.sol";
import {MockPancakeRouter} from "./mocks/MockPancakeRouter.sol";
import {VaultFactory}      from "../src/VaultFactory.sol";
import {SaveSwap}          from "../src/SaveSwap.sol";
import {AutoSaveVault}     from "../src/AutoSaveVault.sol";
import {
    ZeroAmount,
    InvalidSaveBps,
    DeadlinePassed,
    InvalidPath,
    ZeroAddress
} from "../src/SaveSwap.sol";

contract SaveSwapTest is Test {

    MockPancakeRouter router;
    ERC20Mock         usdcMock;
    ERC20Mock         tokenA;
    VaultFactory      factory;
    SaveSwap          swap;

    address owner    = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address alice    = makeAddr("alice");

    uint256 constant ONE = 1e18;

    function setUp() public {
        router   = new MockPancakeRouter();
        usdcMock = new ERC20Mock();
        tokenA   = new ERC20Mock();

        factory = new VaultFactory(address(usdcMock), treasury, address(0), owner);

        swap = new SaveSwap(
            address(router),
            address(usdcMock),
            address(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c),
            address(factory),
            owner
        );

        vm.prank(owner);
        factory.setSaveSwap(address(swap));

        // Fund router with USDC and tokenA for 1:1 mock swaps
        usdcMock.mint(address(router), 1_000_000 * ONE);
        tokenA.mint(address(router),   1_000_000 * ONE);

        tokenA.mint(alice, 1_000 * ONE);
        vm.prank(alice);
        tokenA.approve(address(swap), type(uint256).max);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _usdcPath() internal view returns (address[] memory p) {
        p = new address[](2);
        p[0] = address(tokenA);
        p[1] = address(usdcMock);
    }

    function _trivialPath() internal view returns (address[] memory p) {
        p = new address[](2);
        p[0] = address(tokenA);
        p[1] = address(tokenA);
    }

    function _params(
        uint256 amountIn,
        uint256 saveBps,
        address tokenOut_,
        address[] memory pathMain_,
        address[] memory pathSave_
    ) internal view returns (SaveSwap.SwapParams memory) {
        return SaveSwap.SwapParams({
            tokenIn:      address(tokenA),
            tokenOut:     tokenOut_,
            amountIn:     amountIn,
            minAmountOut: 0,
            saveBps:      saveBps,
            minSaveUsdc:  0,
            lockDuration: 30 days,
            pathMain:     pathMain_,
            pathSave:     pathSave_,
            deadline:     block.timestamp + 1 hours
        });
    }

    // ─── tokenOut = USDC (no save conversion) ────────────────────────────────

    function test_usdcOut_splitsCorrectly() public {
        uint256 amountIn = 100 * ONE;
        uint256 saveBps  = 1_000; // 10%

        address[] memory noPath = new address[](0);
        SaveSwap.SwapParams memory p = _params(amountIn, saveBps, address(usdcMock), _usdcPath(), noPath);

        uint256 aliceUsdcBefore = usdcMock.balanceOf(alice);
        uint256 aliceABefore    = tokenA.balanceOf(alice);

        vm.prank(alice);
        swap.swapAndSave(p);

        uint256 expectedUser = (amountIn * (10_000 - saveBps)) / 10_000;
        assertEq(tokenA.balanceOf(alice),   aliceABefore - amountIn, "tokenA spent");
        assertEq(usdcMock.balanceOf(alice) - aliceUsdcBefore, expectedUser, "USDC to alice");
    }

    function test_usdcOut_lockCreatedForAlice() public {
        address[] memory noPath = new address[](0);
        SaveSwap.SwapParams memory p = _params(100 * ONE, 2_000, address(usdcMock), _usdcPath(), noPath);

        vm.prank(alice);
        uint256 lockId = swap.swapAndSave(p);

        assertTrue(factory.hasVault(alice), "vault deployed");

        AutoSaveVault vault = AutoSaveVault(factory.getVault(alice));
        AutoSaveVault.Lock memory lock = vault.getLock(lockId);
        assertEq(lock.owner, alice);
        assertTrue(lock.principal > 0);
        assertTrue(lock.blinReward > 0, "blin yield tracked");
    }

    function test_usdcOut_blinYieldTrackedNotTransferred() public {
        // $BLIN yield is accumulated on BSC (claimableBlin), no token transfer
        address[] memory noPath = new address[](0);
        SaveSwap.SwapParams memory p = _params(100 * ONE, 1_000, address(usdcMock), _usdcPath(), noPath);

        vm.prank(alice);
        swap.swapAndSave(p);

        // Vault has no blinToken address — yield is just tracked
        AutoSaveVault vault = AutoSaveVault(factory.getVault(alice));
        assertTrue(vault.getLockCount(alice) == 1, "lock created");
    }

    // ─── tokenOut = ERC-20 (non-USDC, save conversion needed) ───────────────

    function test_nonUsdcOut_saveConvertedToUsdc() public {
        address[] memory pathSave = _usdcPath();
        SaveSwap.SwapParams memory p = _params(100 * ONE, 1_000, address(tokenA), _trivialPath(), pathSave);

        vm.prank(alice);
        uint256 lockId = swap.swapAndSave(p);

        AutoSaveVault vault = AutoSaveVault(factory.getVault(alice));
        assertTrue(vault.getLock(lockId).principal > 0, "USDC saved");
    }

    // ─── saveBps = 0 — no vault interaction ──────────────────────────────────

    function test_zeroSaveBps_allToUser() public {
        uint256 amountIn = 50 * ONE;
        address[] memory noPath = new address[](0);
        SaveSwap.SwapParams memory p = _params(amountIn, 0, address(usdcMock), _usdcPath(), noPath);

        uint256 aliceBefore = usdcMock.balanceOf(alice);
        vm.prank(alice);
        uint256 lockId = swap.swapAndSave(p);

        assertEq(usdcMock.balanceOf(alice) - aliceBefore, amountIn, "all to user");
        assertEq(lockId, type(uint256).max, "no lock created");
        assertFalse(factory.hasVault(alice), "no vault deployed");
    }

    // ─── BNB output ───────────────────────────────────────────────────────────

    function test_bnbOut_saveConvertedToUsdc() public {
        address NATIVE = swap.NATIVE();
        vm.deal(address(router), 1_000 ether);

        address[] memory pathMain = new address[](2);
        pathMain[0] = address(tokenA);
        pathMain[1] = NATIVE;

        address[] memory pathSave = new address[](2);
        pathSave[0] = address(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c); // WBNB
        pathSave[1] = address(usdcMock);

        SaveSwap.SwapParams memory p = SaveSwap.SwapParams({
            tokenIn:      address(tokenA),
            tokenOut:     NATIVE,
            amountIn:     100 * ONE,
            minAmountOut: 0,
            saveBps:      1_000,
            minSaveUsdc:  0,
            lockDuration: 30 days,
            pathMain:     pathMain,
            pathSave:     pathSave,
            deadline:     block.timestamp + 1 hours
        });

        uint256 aliceBnbBefore = alice.balance;
        vm.prank(alice);
        uint256 lockId = swap.swapAndSave(p);

        assertTrue(alice.balance > aliceBnbBefore, "BNB to alice");
        AutoSaveVault vault = AutoSaveVault(factory.getVault(alice));
        assertTrue(vault.getLock(lockId).principal > 0, "USDC saved in vault");
    }

    // ─── BNB input ────────────────────────────────────────────────────────────

    function test_bnbIn_usdcOut_lockCreated() public {
        address NATIVE = swap.NATIVE();
        uint256 bnbIn  = 1 ether;
        vm.deal(alice, bnbIn);

        address[] memory pathMain = new address[](2);
        pathMain[0] = address(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);
        pathMain[1] = address(usdcMock);

        address[] memory noPath = new address[](0);

        SaveSwap.SwapParams memory p = SaveSwap.SwapParams({
            tokenIn:      NATIVE,
            tokenOut:     address(usdcMock),
            amountIn:     0,
            minAmountOut: 0,
            saveBps:      1_000,
            minSaveUsdc:  0,
            lockDuration: 30 days,
            pathMain:     pathMain,
            pathSave:     noPath,
            deadline:     block.timestamp + 1 hours
        });

        vm.prank(alice);
        uint256 lockId = swap.swapAndSave{value: bnbIn}(p);

        AutoSaveVault vault = AutoSaveVault(factory.getVault(alice));
        assertEq(vault.getLock(lockId).owner, alice);
        assertTrue(vault.getLock(lockId).principal > 0);
    }

    // ─── Reverts ──────────────────────────────────────────────────────────────

    function test_revertsDeadlinePassed() public {
        vm.warp(1_000);
        address[] memory noPath = new address[](0);
        SaveSwap.SwapParams memory p = _params(ONE, 500, address(usdcMock), _usdcPath(), noPath);
        p.deadline = block.timestamp - 1;
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DeadlinePassed.selector, p.deadline, block.timestamp));
        swap.swapAndSave(p);
    }

    function test_revertsZeroAmount() public {
        address[] memory noPath = new address[](0);
        SaveSwap.SwapParams memory p = _params(0, 500, address(usdcMock), _usdcPath(), noPath);
        vm.prank(alice);
        vm.expectRevert(ZeroAmount.selector);
        swap.swapAndSave(p);
    }

    function test_revertsInvalidSaveBps() public {
        uint256 bad = swap.MAX_SAVE_BPS() + 1;
        address[] memory noPath = new address[](0);
        SaveSwap.SwapParams memory p = _params(ONE, bad, address(usdcMock), _usdcPath(), noPath);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(InvalidSaveBps.selector, bad));
        swap.swapAndSave(p);
    }

    function test_revertsShortPath() public {
        address[] memory shortPath = new address[](1);
        shortPath[0] = address(tokenA);
        address[] memory noPath = new address[](0);
        SaveSwap.SwapParams memory p = _params(ONE, 500, address(usdcMock), shortPath, noPath);
        vm.prank(alice);
        vm.expectRevert(InvalidPath.selector);
        swap.swapAndSave(p);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function test_setVaultFactory() public {
        VaultFactory newF = new VaultFactory(address(usdcMock), treasury, address(0), owner);
        vm.prank(owner);
        swap.setVaultFactory(address(newF));
        assertEq(address(swap.vaultFactory()), address(newF));
    }

    function test_setVaultFactory_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        swap.setVaultFactory(address(factory));
    }

    // ─── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_usdcOut_splitConservation(uint256 amountIn, uint256 saveBps) public {
        amountIn = bound(amountIn, 1, 500 * ONE);
        saveBps  = bound(saveBps,  0, swap.MAX_SAVE_BPS());

        tokenA.mint(alice, amountIn);
        usdcMock.mint(address(router), amountIn);

        address[] memory noPath = new address[](0);
        SaveSwap.SwapParams memory p = _params(amountIn, saveBps, address(usdcMock), _usdcPath(), noPath);

        uint256 aliceUsdcBefore = usdcMock.balanceOf(alice);
        vm.prank(alice);
        swap.swapAndSave(p);

        uint256 userReceived = usdcMock.balanceOf(alice) - aliceUsdcBefore;
        uint256 savedAmount;

        if (saveBps > 0 && factory.hasVault(alice)) {
            AutoSaveVault vault = AutoSaveVault(factory.getVault(alice));
            AutoSaveVault.Lock[] memory locks = vault.getUserLocks(alice);
            if (locks.length > 0) savedAmount = locks[0].principal;
        }

        assertEq(userReceived + savedAmount, amountIn, "conservation: user + saved = amountOut");
    }
}
