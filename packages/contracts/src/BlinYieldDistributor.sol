// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20}       from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20}    from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable}      from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712}       from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA}        from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// ─── Custom errors ────────────────────────────────────────────────────────────

error InvalidSignature();
error VoucherExpired(uint256 deadline, uint256 current);
error VoucherAlreadyUsed(bytes32 nonce);
error ZeroAmount();
error ZeroAddress();
error InsufficientBlinBalance(uint256 required, uint256 available);

/// @title BlinYieldDistributor  (Ethereum Mainnet)
/// @notice Pays $BLIN rewards to users who locked USDC in an AutoSaveVault on BSC.
///
///         Flow:
///           1. User locks USDC on BSC → AutoSaveVault tracks claimableBlin.
///           2. User withdraws USDC → AutoSaveVault emits BlinYieldFinalized(user, lockId, amount, total).
///           3. Backend (trusted signer) reads the event and issues an EIP-712
///              signed voucher: Claim(address user, uint256 amount, bytes32 nonce, uint256 deadline).
///           4. User submits voucher on Ethereum → this contract verifies the
///              signature and transfers $BLIN from its balance.
///
///         The contract must be pre-funded with $BLIN by the treasury.
///         $BLIN contract on Ethereum: 0xaEFB54306240502c5421Be478fa16aACfA9698A2
///
/// @dev    Uses EIP-712 structured data signing for replay-safe, gas-efficient claims.
///         Nonces are arbitrary bytes32 values (e.g. keccak256(chainId, lockId, user))
///         chosen by the signer — once used they cannot be reused.
contract BlinYieldDistributor is Ownable, EIP712 {
    using SafeERC20 for IERC20;

    // ─── EIP-712 type hash ────────────────────────────────────────────────────

    /// @dev keccak256("Claim(address user,uint256 amount,bytes32 nonce,uint256 deadline)")
    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "Claim(address user,uint256 amount,bytes32 nonce,uint256 deadline)"
    );

    // ─── Immutables ───────────────────────────────────────────────────────────

    /// @notice $BLIN token on Ethereum.
    IERC20 public immutable blin;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Address whose private key signs claim vouchers (protocol backend).
    address public signer;

    /// @notice Nonces that have already been used to prevent double-claims.
    mapping(bytes32 => bool) public usedNonces;

    /// @notice Total $BLIN paid out per user (informational).
    mapping(address => uint256) public totalClaimed;

    // ─── Events ───────────────────────────────────────────────────────────────

    event BlinClaimed(
        address indexed user,
        uint256 amount,
        bytes32 indexed nonce
    );
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event FundsWithdrawn(address indexed to, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param blin_    $BLIN token address on Ethereum (0xaEFB54306240502c5421Be478fa16aACfA9698A2).
    /// @param signer_  Backend wallet that signs claim vouchers.
    /// @param owner_   Protocol multisig; can update signer and recover tokens.
    constructor(address blin_, address signer_, address owner_)
        Ownable(owner_)
        EIP712("BlinYieldDistributor", "1")
    {
        if (blin_ == address(0) || signer_ == address(0) || owner_ == address(0))
            revert ZeroAddress();

        blin   = IERC20(blin_);
        signer = signer_;
    }

    // ─── Claim ────────────────────────────────────────────────────────────────

    /// @notice Claim $BLIN rewards using a backend-issued voucher.
    ///
    /// @param amount    $BLIN wei to claim (must match voucher).
    /// @param nonce     Unique identifier for this voucher (e.g. keccak256(bscChainId, lockId, user)).
    /// @param deadline  Unix timestamp after which the voucher expires.
    /// @param signature EIP-712 signature from the protocol signer.
    function claim(
        uint256 amount,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (amount == 0)                    revert ZeroAmount();
        if (block.timestamp > deadline)     revert VoucherExpired(deadline, block.timestamp);
        if (usedNonces[nonce])              revert VoucherAlreadyUsed(nonce);

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, msg.sender, amount, nonce, deadline)
        );
        address recovered = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        if (recovered != signer) revert InvalidSignature();

        // Check balance before transfer
        uint256 available = blin.balanceOf(address(this));
        if (available < amount) revert InsufficientBlinBalance(amount, available);

        // Mark nonce used and transfer
        usedNonces[nonce]          = true;
        totalClaimed[msg.sender]  += amount;

        blin.safeTransfer(msg.sender, amount);

        emit BlinClaimed(msg.sender, amount, nonce);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice $BLIN currently held by this contract (available for payouts).
    function blinReserve() external view returns (uint256) {
        return blin.balanceOf(address(this));
    }

    /// @notice Preview the EIP-712 hash for a given claim — useful for the backend
    ///         to construct and sign vouchers off-chain.
    function hashClaim(
        address user,
        uint256 amount,
        bytes32 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(CLAIM_TYPEHASH, user, amount, nonce, deadline))
        );
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Update the signer wallet (e.g. on key rotation).
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit SignerUpdated(signer, newSigner);
        signer = newSigner;
    }

    /// @notice Withdraw $BLIN from this contract (e.g. to rebalance treasury).
    function withdrawFunds(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        blin.safeTransfer(to, amount);
        emit FundsWithdrawn(to, amount);
    }
}
