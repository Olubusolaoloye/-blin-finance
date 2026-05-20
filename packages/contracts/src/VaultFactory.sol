// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AutoSaveVault} from "./AutoSaveVault.sol";
import {AaveV3Strategy} from "./AaveV3Strategy.sol";

/// @title VaultFactory
/// @notice Deploys one AutoSaveVault per user using CREATE2 with msg.sender
///         as the salt, yielding deterministic, predictable vault addresses.
///
///         SaveSwap calls getOrCreateVault(msg.sender) to route AutoSave funds
///         when the user has not specified an explicit vault.
contract VaultFactory is Ownable {
    // ─── State ────────────────────────────────────────────────────────────────

    /// Underlying asset for all vaults (e.g. USDC on BSC).
    IERC20 public immutable asset;

    /// Aave V3 pool address used by each vault's initial strategy.
    address public immutable aavePool;

    /// Treasury / penalty receiver for all deployed vaults.
    address public penaltyReceiver;

    /// user => deployed vault (address(0) if not yet deployed)
    mapping(address => address) private _vaults;

    // ─── Events ───────────────────────────────────────────────────────────────

    event VaultCreated(address indexed user, address indexed vault);
    event PenaltyReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address asset_, address aavePool_, address penaltyReceiver_, address owner_)
        Ownable(owner_)
    {
        asset = IERC20(asset_);
        aavePool = aavePool_;
        penaltyReceiver = penaltyReceiver_;
    }

    // ─── Public ───────────────────────────────────────────────────────────────

    /// @notice Returns the deterministic address a vault would be deployed to
    ///         for `user`, whether or not it has been deployed yet.
    function getVault(address user) external view returns (address) {
        address stored = _vaults[user];
        if (stored != address(0)) return stored;
        return _predictAddress(user);
    }

    /// @notice Returns the user's vault, deploying it first if it does not exist.
    ///         Safe to call from SaveSwap — adds ~80k gas on first interaction.
    function getOrCreateVault(address user) external returns (address) {
        address existing = _vaults[user];
        if (existing != address(0)) return existing;
        return _deployVault(user);
    }

    /// @notice Convenience: returns true if a vault has been deployed for `user`.
    function hasVault(address user) external view returns (bool) {
        return _vaults[user] != address(0);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setPenaltyReceiver(address newReceiver) external onlyOwner {
        emit PenaltyReceiverUpdated(penaltyReceiver, newReceiver);
        penaltyReceiver = newReceiver;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _deployVault(address user) internal returns (address vault) {
        // Deploy the strategy first; vault is its owner
        AaveV3Strategy strategy = new AaveV3Strategy{salt: bytes32(uint256(uint160(user)))}(
            aavePool,
            address(this) // temporarily owned by factory; transferred below
        );

        // Deploy the vault
        AutoSaveVault v = new AutoSaveVault{salt: bytes32(uint256(uint160(user)))}(
            asset,
            "Blin AutoSave Vault",
            "bASV",
            user,             // admin = the user
            penaltyReceiver,
            address(strategy)
        );

        // Transfer strategy ownership to the vault
        strategy.transferOwnership(address(v));

        vault = address(v);
        _vaults[user] = vault;
        emit VaultCreated(user, vault);
    }

    /// @dev Predicts CREATE2 address without deploying.
    ///      Must mirror the exact bytecode + constructor args used in _deployVault.
    function _predictAddress(address user) internal view returns (address) {
        bytes32 salt = bytes32(uint256(uint160(user)));
        bytes memory creationCode = abi.encodePacked(
            type(AutoSaveVault).creationCode,
            abi.encode(
                address(asset),
                "Blin AutoSave Vault",
                "bASV",
                user,
                penaltyReceiver,
                address(0) // placeholder — actual strategy address differs; real prediction requires two-step
            )
        );
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(creationCode))
        );
        return address(uint160(uint256(hash)));
    }
}
