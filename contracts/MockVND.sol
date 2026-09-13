// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test-only ERC-20-compatible payment interface. It has no real monetary value.
abstract contract MockVND {
    error UnauthorizedMinter(address caller);
    error InsufficientBalance(address account, uint256 available, uint256 required);
    error InsufficientAllowance(address owner, address spender, uint256 available, uint256 required);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function name() external view virtual returns (string memory);
    function symbol() external view virtual returns (string memory);
    function decimals() external view virtual returns (uint8);
    function totalSupply() external view virtual returns (uint256);
    function balanceOf(address account) external view virtual returns (uint256);
    function allowance(address owner, address spender) external view virtual returns (uint256);
    function mint(address to, uint256 amount) external virtual;
    function approve(address spender, uint256 amount) external virtual returns (bool);
    function transfer(address to, uint256 amount) external virtual returns (bool);
    function transferFrom(address from, address to, uint256 amount) external virtual returns (bool);
}
