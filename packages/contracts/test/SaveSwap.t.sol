// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AutoSaveVault} from "../src/AutoSaveVault.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {SaveSwap} from "../src/SaveSwap.sol";
import {IYieldStrategy} from "../src/interfaces/IYieldStrategy.sol";
import {
    ZeroAmount,
    InvalidSaveBps,
    SwapFailed,
    DeadlinePassed,
    UnsupportedAggregator
} from "../src/SaveSwap.sol";

/// @notice Stub yield strategy for vault construction.
contract SaveSwapNoopStrategy is IYieldStrategy {
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

/// @notice Mock aggregator: swaps tokenIn 1:1 for tokenOut, forwarding to SaveSwap.
contract MockAggregator {
    ERC20Mock public tokenIn;
    ERC20Mock public tokenOut;

    constructor(ERC20Mock _in, ERC20Mock _out) {
        tokenIn  = _in;
        tokenOut = _out;
    }

    /// Called by SaveSwap via low-level call. Pulls tokenIn from SaveSwap and
    /// pushes tokenOut back to SaveSwap (1:1 swap, no fees).
    function swap(address saveSwap, uint256 amountIn) external {
        tokenIn.transferFrom(saveSwap, address(this), amountIn);
        tokenOut.transfer(saveSwap, amountIn);
    }
}

/// @notice Aggregator that always fails.
contract FailingAggregator {
    fallback() external { revert("swap failure"); }
}

contract SaveSwapTest is Test {
    SaveSwap        saveSwap;
    AutoSaveVault   vault;
    ERC20Mock       tokenIn;
    ERC20Mock       tokenOut;
    MockAggregator  aggregator;
    SaveSwapNoopStrategy strategy;

    address owner    = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address alice    = makeAddr("alice");

    uint256 constant ONE = 1e18;

    function setUp() public {
        tokenIn  = new ERC20Mock();
        tokenOut = new ERC20Mock();

        // Deploy a standalone vault backed by tokenOut
        strategy = new SaveSwapNoopStrategy();
        vault = new AutoSaveVault(
            tokenOut,
            "Blin Save TEST",
            "bsTEST",
            owner,
            treasury,
            address(strategy)
        );

        // Deploy a minimal VaultFactory stub — point to a fake aavePool
        // SaveSwap resolves vault per-user; we override it to our vault.
        VaultFactory factory = new VaultFactory(
            address(tokenOut),
            makeAddr("aavePool"),
            treasury,
            owner
        );

        saveSwap = new SaveSwap(address(factory), owner);

        aggregator = new MockAggregator(tokenIn, tokenOut);

        // Approve aggregator and mint tokenOut for aggregator to pay out
        vm.prank(owner);
        saveSwap.setAggregator(address(aggregator), true);

        tokenIn.mint(alice, 1_000 * ONE);
        tokenOut.mint(address(aggregator), 1_000 * ONE);

        vm.prank(alice);
        tokenIn.approve(address(saveSwap), type(uint256).max);

        // Override alice's vault to our pre-deployed one
        vm.prank(alice);
        saveSwap.setVaultOverride(address(vault));
    }

    // ─── swapAndSave happy path ───────────────────────────────────────────────

    function _buildParams(
        uint256 amountIn,
        uint256 saveBps,
        uint256 deadlineOffset
    ) internal view returns (SaveSwap.SwapParams memory) {
        return SaveSwap.SwapParams({
            tokenIn:        address(tokenIn),
            tokenOut:       address(tokenOut),
            amountIn:       amountIn,
            minAmountOut:   amountIn, // 1:1 mock
            saveBps:        saveBps,
            aggregator:     address(aggregator),
            aggregatorData: abi.encodeCall(MockAggregator.swap, (address(saveSwap), amountIn)),
            deadline:       block.timestamp + deadlineOffset
        });
    }

    function test_swapAndSave_splitsCorrectly() public {
        uint256 amountIn = 100 * ONE;
        uint256 saveBps  = 1000; // 10%

        uint256 aliceInBefore  = tokenIn.balanceOf(alice);
        uint256 aliceOutBefore = tokenOut.balanceOf(alice);

        vm.prank(alice);
        uint256 savedAmount = saveSwap.swapAndSave(_buildParams(amountIn, saveBps, 1 hours));

        uint256 expectedSaved = (amountIn * saveBps) / 10_000;
        uint256 expectedUser  = amountIn - expectedSaved;

        assertEq(savedAmount, expectedSaved, "savedAmount return");
        assertEq(tokenIn.balanceOf(alice),  aliceInBefore  - amountIn,     "tokenIn spent");
        assertEq(tokenOut.balanceOf(alice), aliceOutBefore + expectedUser,  "tokenOut received");
    }

    function test_swapAndSave_zeroSaveBps_allToUser() public {
        uint256 amountIn = 50 * ONE;
        vm.prank(alice);
        uint256 saved = saveSwap.swapAndSave(_buildParams(amountIn, 0, 1 hours));

        assertEq(saved, 0, "nothing saved");
        assertEq(tokenOut.balanceOf(alice), amountIn, "all to user");
    }

    function test_swapAndSave_maxSaveBps() public {
        uint256 amountIn = 100 * ONE;
        uint256 saveBps  = saveSwap.MAX_SAVE_BPS(); // 50%
        vm.prank(alice);
        uint256 saved = saveSwap.swapAndSave(_buildParams(amountIn, saveBps, 1 hours));
        assertEq(saved, amountIn / 2, "50% saved");
    }

    // ─── swapAndSave reverts ──────────────────────────────────────────────────

    function test_swapAndSave_revertsDeadlinePassed() public {
        vm.warp(1_000);
        SaveSwap.SwapParams memory p = _buildParams(ONE, 500, 0);
        p.deadline = block.timestamp - 1;

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(DeadlinePassed.selector, p.deadline, block.timestamp)
        );
        saveSwap.swapAndSave(p);
    }

    function test_swapAndSave_revertsZeroAmount() public {
        SaveSwap.SwapParams memory p = _buildParams(0, 500, 1 hours);
        vm.prank(alice);
        vm.expectRevert(ZeroAmount.selector);
        saveSwap.swapAndSave(p);
    }

    function test_swapAndSave_revertsInvalidSaveBps() public {
        uint256 bad = saveSwap.MAX_SAVE_BPS() + 1;
        SaveSwap.SwapParams memory p = _buildParams(ONE, bad, 1 hours);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(InvalidSaveBps.selector, bad));
        saveSwap.swapAndSave(p);
    }

    function test_swapAndSave_revertsUnapprovedAggregator() public {
        address bad = makeAddr("badAggregator");
        SaveSwap.SwapParams memory p = _buildParams(ONE, 500, 1 hours);
        p.aggregator = bad;
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(UnsupportedAggregator.selector, bad));
        saveSwap.swapAndSave(p);
    }

    function test_swapAndSave_revertsOnSwapFailure() public {
        FailingAggregator failing = new FailingAggregator();
        vm.prank(owner);
        saveSwap.setAggregator(address(failing), true);

        SaveSwap.SwapParams memory p = _buildParams(ONE, 500, 1 hours);
        p.aggregator     = address(failing);
        p.aggregatorData = "";

        vm.prank(alice);
        vm.expectRevert(SwapFailed.selector);
        saveSwap.swapAndSave(p);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function test_setAggregator_approves() public {
        address newAgg = makeAddr("newAgg");
        vm.prank(owner);
        saveSwap.setAggregator(newAgg, true);
        assertTrue(saveSwap.approvedAggregators(newAgg));
    }

    function test_setAggregator_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        saveSwap.setAggregator(address(aggregator), false);
    }

    function test_setVaultFactory_updatesFactory() public {
        VaultFactory newFactory = new VaultFactory(address(tokenOut), makeAddr("ap"), treasury, owner);
        vm.prank(owner);
        saveSwap.setVaultFactory(address(newFactory));
        assertEq(address(saveSwap.vaultFactory()), address(newFactory));
    }

    function test_setVaultOverride_usesOverride() public {
        // alice's override is already set in setUp; verify it's used
        assertEq(saveSwap.userVaultOverride(alice), address(vault));
    }

    function test_setVaultOverride_clearOverride() public {
        vm.prank(alice);
        saveSwap.setVaultOverride(address(0));
        assertEq(saveSwap.userVaultOverride(alice), address(0));
    }

    // ─── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_swapAndSave_splitIsConservative(uint256 amountIn, uint256 saveBps) public {
        amountIn = bound(amountIn, 1, 500 * ONE);
        saveBps  = bound(saveBps,  0, saveSwap.MAX_SAVE_BPS());

        tokenIn.mint(alice, amountIn);
        tokenOut.mint(address(aggregator), amountIn);

        uint256 aliceOutBefore = tokenOut.balanceOf(alice);

        vm.prank(alice);
        uint256 saved = saveSwap.swapAndSave(_buildParams(amountIn, saveBps, 1 hours));

        uint256 userReceived = tokenOut.balanceOf(alice) - aliceOutBefore;
        assertEq(saved + userReceived, amountIn, "split must equal amountOut");
    }
}
