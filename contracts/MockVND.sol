// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only ERC-20-compatible payment token with no real monetary value.
contract MockVND is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    error UnauthorizedMinter(address caller);
    error InsufficientBalance(address account, uint256 available, uint256 required);
    error InsufficientAllowance(address owner, address spender, uint256 available, uint256 required);

    constructor() ERC20("Mock Vietnamese Dong", "mVND") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external {
        if (!hasRole(MINTER_ROLE, msg.sender)) {
            revert UnauthorizedMinter(msg.sender);
        }

        _mint(to, amount);
    }

    function transfer(address to, uint256 amount)
        public
        override
        returns (bool)
    {
        address owner = _msgSender();
        uint256 available = balanceOf(owner);

        if (available < amount) {
            revert InsufficientBalance(owner, available, amount);
        }

        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        address spender = _msgSender();
        uint256 availableAllowance = allowance(from, spender);

        if (
            availableAllowance != type(uint256).max &&
            availableAllowance < amount
        ) {
            revert InsufficientAllowance(
                from,
                spender,
                availableAllowance,
                amount
            );
        }

        uint256 availableBalance = balanceOf(from);

        if (availableBalance < amount) {
            revert InsufficientBalance(
                from,
                availableBalance,
                amount
            );
        }

        return super.transferFrom(from, to, amount);
    }
}
