// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Authorised resale path that prevents royalty bypass through direct transfers.
abstract contract SecondaryMarketplace {
    struct Listing {
        uint256 designId;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }

    error NotEntitlementOwner(address seller, uint256 tokenId);
    error EntitlementNotTransferable(uint256 tokenId);
    error InvalidPrice(uint256 price);
    error ListingNotActive(uint256 listingId);
    error SellerNoLongerOwner(uint256 listingId);
    error DesignIsSuspended(uint256 designId);
    error InvalidBpsTotal(uint256 totalBps);
    error AlreadyPurchased(uint256 listingId);

    event ResaleListed(
        uint256 indexed listingId,
        uint256 indexed designId,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event ResaleCompleted(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price,
        uint256 artistRoyalty
    );
    event ResaleProceedsAvailable(address indexed recipient, uint256 amount, bytes32 indexed revenueType);

    function listForResale(
        uint256 designId,
        uint256 tokenId,
        uint256 price
    ) external virtual returns (uint256 listingId);

    function cancelListing(uint256 listingId) external virtual;
    function buyResale(uint256 listingId) external virtual;
    function withdrawProceeds() external virtual;
    function getListing(uint256 listingId) external view virtual returns (Listing memory);
}
