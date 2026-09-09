// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Limited usage entitlement; this token is not copyright or ownership of game IP.
abstract contract SkinEntitlement1155 {
    error UnauthorizedMinter(address caller);
    error UnauthorizedMarketplace(address caller);
    error DirectTransferDisabled();
    error SupplyCapExceeded(uint256 designId, uint256 maxSupply);
    error EntitlementPaused();

    event EntitlementMinted(
        uint256 indexed designId,
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount
    );
    event EntitlementTransferred(
        uint256 indexed designId,
        uint256 indexed tokenId,
        address indexed previousOwner,
        address newOwner,
        uint256 amount
    );
    event MarketplaceAuthorizationUpdated(address indexed marketplace, bool authorised);
    event TransferabilityUpdated(uint256 indexed tokenId, bool transferable);

    function mint(
        address to,
        uint256 designId,
        uint256 tokenId,
        uint256 amount,
        string calldata metadataURI
    ) external virtual;

    function authorisedTransfer(
        address from,
        address to,
        uint256 designId,
        uint256 tokenId,
        uint256 amount
    ) external virtual;

    function setMarketplaceAuthorization(address marketplace, bool authorised) external virtual;
    function setTransferable(uint256 tokenId, bool transferable) external virtual;
    function balanceOf(address account, uint256 tokenId) external view virtual returns (uint256);
    function totalSupply(uint256 tokenId) external view virtual returns (uint256);
    function isTransferable(uint256 tokenId) external view virtual returns (bool);
}
