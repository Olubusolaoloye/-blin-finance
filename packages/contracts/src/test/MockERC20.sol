// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice Mintable / burnable ERC-20 used as testnet USDC / USDT.
///         Anyone can call faucet() to self-mint up to 10,000 tokens per call.
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;
    uint256 public constant FAUCET_AMOUNT = 10_000;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mint `FAUCET_AMOUNT` tokens (in atomic units) to the caller.
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT * (10 ** _decimals));
    }

    /// @notice Admin mint — for scripts to seed accounts with exact amounts.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
