// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20}    from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable}  from "@openzeppelin/contracts/access/Ownable.sol";

// ─── Custom errors ────────────────────────────────────────────────────────────

error MaxSupplyExceeded(uint256 requested, uint256 remaining);
error ZeroAddress();

/// @title BlinToken
/// @notice ERC-20 governance and reward token for the Blin Finance protocol.
///
///         $BLIN is the primary reward for locking USDC in an AutoSaveVault.
///         Rewards are paid by transferring tokens FROM the vault's pre-funded
///         $BLIN balance — NOT by minting new tokens.
///
///         The canonical $BLIN supply lives on Ethereum.  Treasury wallets bridge
///         tokens to BSC and transfer them directly to AutoSaveVault contracts so
///         users can claim them on withdrawal.
///
///         This contract is provided for reference / local testnet deployment.
///         On BSC mainnet, point AutoSaveVault at the bridged token address.
///
/// @dev    Supply hard-capped at 1 billion. No burn, no inflation by design.
contract BlinToken is ERC20, Ownable {

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Hard cap: 1 000 000 000 $BLIN (18 decimals).
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param owner_   Protocol multisig. Receives the initial supply.
    /// @param initialSupply  Tokens minted to owner_ at deployment (≤ MAX_SUPPLY).
    constructor(address owner_, uint256 initialSupply)
        ERC20("Blin Finance", "BLIN")
        Ownable(owner_)
    {
        if (owner_ == address(0)) revert ZeroAddress();
        if (initialSupply > MAX_SUPPLY) revert MaxSupplyExceeded(initialSupply, MAX_SUPPLY);
        if (initialSupply > 0) {
            _mint(owner_, initialSupply);
        }
    }
}
