// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable}      from "@openzeppelin/contracts/access/Ownable.sol";
import {AutoSaveVault} from "./AutoSaveVault.sol";

// ─── Custom errors ────────────────────────────────────────────────────────────

error ZeroAddress();

/// @title VaultFactory  (BSC)
/// @notice Deploys one AutoSaveVault per user via CREATE2 (salt = user address).
///
///         Role wiring on each new vault:
///           1. SaveSwap receives OPERATOR_ROLE  → can call createLockFor().
///           2. The user receives DEFAULT_ADMIN_ROLE → controls their vault.
///           3. Factory renounces DEFAULT_ADMIN_ROLE after wiring.
contract VaultFactory is Ownable {
    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice USDC token passed to every deployed AutoSaveVault.
    address public immutable usdc;

    /// @notice Treasury receiving early-exit USDC penalties.
    address public treasury;

    /// @notice SaveSwap contract granted OPERATOR_ROLE on every new vault.
    address public saveSwap;

    mapping(address => address) private _vaults;

    // ─── Events ───────────────────────────────────────────────────────────────

    event VaultCreated(address indexed user, address indexed vault);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event SaveSwapUpdated(address indexed oldSaveSwap, address indexed newSaveSwap);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address usdc_,
        address treasury_,
        address saveSwap_,   // may be address(0) pre-deployment
        address owner_
    ) Ownable(owner_) {
        if (usdc_ == address(0) || treasury_ == address(0) || owner_ == address(0))
            revert ZeroAddress();

        usdc     = usdc_;
        treasury = treasury_;
        saveSwap = saveSwap_;
    }

    // ─── Public ───────────────────────────────────────────────────────────────

    function getVault(address user) external view returns (address) {
        return _vaults[user];
    }

    /// @notice Returns the user's vault, deploying on first call.
    function getOrCreateVault(address user) external returns (address) {
        address existing = _vaults[user];
        if (existing != address(0)) return existing;
        return _deployVault(user);
    }

    function hasVault(address user) external view returns (bool) {
        return _vaults[user] != address(0);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setSaveSwap(address newSaveSwap) external onlyOwner {
        emit SaveSwapUpdated(saveSwap, newSaveSwap);
        saveSwap = newSaveSwap;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _deployVault(address user) internal returns (address vault) {
        AutoSaveVault v = new AutoSaveVault{salt: bytes32(uint256(uint160(user)))}(
            usdc,
            treasury,
            address(this)   // factory is temporary admin
        );

        // 1. Grant OPERATOR_ROLE to SaveSwap
        if (saveSwap != address(0)) {
            v.grantRole(v.OPERATOR_ROLE(), saveSwap);
        }

        // 2. Grant DEFAULT_ADMIN_ROLE to the user
        v.grantRole(v.DEFAULT_ADMIN_ROLE(), user);

        // 3. Revoke factory's OPERATOR_ROLE (auto-granted by vault constructor)
        v.revokeRole(v.OPERATOR_ROLE(), address(this));

        // 4. Factory steps down as admin
        v.renounceRole(v.DEFAULT_ADMIN_ROLE(), address(this));

        vault = address(v);
        _vaults[user] = vault;
        emit VaultCreated(user, vault);
    }
}
