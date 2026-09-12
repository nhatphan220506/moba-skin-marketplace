// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAssetRegistryResale {
    function isSuspended(uint256 designId) external view returns (bool);
    function getCommercialTerms(
        uint256 designId
    ) external view returns (
        address artist,
        uint16 artistPrimaryShareBps,
        uint16 artistResaleRoyaltyBps,
        bool recorded
    );
}

interface ISkinEntitlementResale {
    function balanceOf(address account, uint256 tokenId) external view returns (uint256);
    function isTransferable(uint256 tokenId) external view returns (bool);
    function authorisedTransfer(
        address from,
        address to,
        uint256 designId,
        uint256 tokenId,
        uint256 amount
    ) external;
}

/// @notice Authorised resale path that prevents royalty bypass through direct transfers.
contract SecondaryMarketplace is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Listing {
        uint256 designId;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }

    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant PUBLISHER_RESALE_BPS = 300;
    uint256 private constant MARKETPLACE_RESALE_BPS = 200;
    bytes32 private constant SELLER_RESALE = keccak256("SELLER_RESALE");
    bytes32 private constant ARTIST_RESALE = keccak256("ARTIST_RESALE");
    bytes32 private constant PUBLISHER_RESALE = keccak256("PUBLISHER_RESALE");
    bytes32 private constant MARKETPLACE_RESALE = keccak256("MARKETPLACE_RESALE");

    IAssetRegistryResale private immutable _assetRegistry;
    IERC20 private immutable _paymentToken;
    ISkinEntitlementResale private immutable _entitlement;
    address private immutable _publisherTreasury;
    address private immutable _marketplaceTreasury;

    uint256 private _nextListingId = 1;
    mapping(uint256 => Listing) private _listings;
    mapping(uint256 => bool) private _listingExists;
    mapping(uint256 => bool) private _purchased;
    mapping(address => uint256) private _pendingProceeds;
    mapping(address => mapping(uint256 => uint256)) private _activeListingBySellerAndToken;

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
    event ResaleProceedsAvailable(
        address indexed recipient,
        uint256 amount,
        bytes32 indexed revenueType
    );

    constructor(
        address assetRegistryAddress,
        address paymentTokenAddress,
        address entitlementAddress,
        address publisherTreasuryAddress,
        address marketplaceTreasuryAddress
    ) {
        require(assetRegistryAddress != address(0), "SecondaryMarketplace: zero asset registry");
        require(paymentTokenAddress != address(0), "SecondaryMarketplace: zero payment token");
        require(entitlementAddress != address(0), "SecondaryMarketplace: zero entitlement");
        require(publisherTreasuryAddress != address(0), "SecondaryMarketplace: zero publisher treasury");
        require(marketplaceTreasuryAddress != address(0), "SecondaryMarketplace: zero marketplace treasury");

        _assetRegistry = IAssetRegistryResale(assetRegistryAddress);
        _paymentToken = IERC20(paymentTokenAddress);
        _entitlement = ISkinEntitlementResale(entitlementAddress);
        _publisherTreasury = publisherTreasuryAddress;
        _marketplaceTreasury = marketplaceTreasuryAddress;
    }

    function listForResale(
        uint256 designId,
        uint256 tokenId,
        uint256 price
    ) external returns (uint256 listingId) {
        require(designId == tokenId, "SecondaryMarketplace: token/design mismatch");
        if (price == 0) revert InvalidPrice(price);
        if (_assetRegistry.isSuspended(designId)) revert DesignIsSuspended(designId);
        if (_entitlement.balanceOf(msg.sender, tokenId) < 1) {
            revert NotEntitlementOwner(msg.sender, tokenId);
        }
        if (!_entitlement.isTransferable(tokenId)) {
            revert EntitlementNotTransferable(tokenId);
        }
        require(
            _activeListingBySellerAndToken[msg.sender][tokenId] == 0,
            "SecondaryMarketplace: active listing exists"
        );

        listingId = _nextListingId++;
        _listings[listingId] = Listing({
            designId: designId,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true
        });
        _listingExists[listingId] = true;
        _activeListingBySellerAndToken[msg.sender][tokenId] = listingId;
        emit ResaleListed(listingId, designId, tokenId, msg.sender, price);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = _getActiveListing(listingId);
        require(listing.seller == msg.sender, "SecondaryMarketplace: not seller");
        listing.active = false;
        delete _activeListingBySellerAndToken[listing.seller][listing.tokenId];
        emit ListingCancelled(listingId, listing.seller);
    }

    function buyResale(uint256 listingId) external nonReentrant {
        if (!_listingExists[listingId]) revert ListingNotActive(listingId);
        if (_purchased[listingId]) revert AlreadyPurchased(listingId);
        Listing storage listing = _listings[listingId];
        if (!listing.active) revert ListingNotActive(listingId);
        require(msg.sender != listing.seller, "SecondaryMarketplace: seller is buyer");
        if (_assetRegistry.isSuspended(listing.designId)) {
            revert DesignIsSuspended(listing.designId);
        }
        if (_entitlement.balanceOf(listing.seller, listing.tokenId) < 1) {
            revert SellerNoLongerOwner(listingId);
        }
        if (!_entitlement.isTransferable(listing.tokenId)) {
            revert EntitlementNotTransferable(listing.tokenId);
        }

        (
            address artist,
            ,
            uint16 artistResaleRoyaltyBps,
            bool recorded
        ) = _assetRegistry.getCommercialTerms(listing.designId);
        require(recorded && artist != address(0), "SecondaryMarketplace: missing commercial terms");

        uint256 nonSellerBps = uint256(artistResaleRoyaltyBps) +
            PUBLISHER_RESALE_BPS +
            MARKETPLACE_RESALE_BPS;
        if (nonSellerBps >= BPS_DENOMINATOR) revert InvalidBpsTotal(nonSellerBps);

        uint256 artistAmount = (listing.price * uint256(artistResaleRoyaltyBps)) /
            BPS_DENOMINATOR;
        uint256 publisherAmount = (listing.price * PUBLISHER_RESALE_BPS) /
            BPS_DENOMINATOR;
        uint256 marketplaceAmount = (listing.price * MARKETPLACE_RESALE_BPS) /
            BPS_DENOMINATOR;
        uint256 sellerAmount = listing.price -
            artistAmount -
            publisherAmount -
            marketplaceAmount;

        listing.active = false;
        _purchased[listingId] = true;
        delete _activeListingBySellerAndToken[listing.seller][listing.tokenId];
        _pendingProceeds[listing.seller] += sellerAmount;
        _pendingProceeds[artist] += artistAmount;
        _pendingProceeds[_publisherTreasury] += publisherAmount;
        _pendingProceeds[_marketplaceTreasury] += marketplaceAmount;

        _paymentToken.safeTransferFrom(msg.sender, address(this), listing.price);
        _entitlement.authorisedTransfer(
            listing.seller,
            msg.sender,
            listing.designId,
            listing.tokenId,
            1
        );

        emit ResaleProceedsAvailable(listing.seller, sellerAmount, SELLER_RESALE);
        emit ResaleProceedsAvailable(artist, artistAmount, ARTIST_RESALE);
        emit ResaleProceedsAvailable(_publisherTreasury, publisherAmount, PUBLISHER_RESALE);
        emit ResaleProceedsAvailable(_marketplaceTreasury, marketplaceAmount, MARKETPLACE_RESALE);
        emit ResaleCompleted(
            listingId,
            listing.tokenId,
            listing.seller,
            msg.sender,
            listing.price,
            artistAmount
        );
    }

    function withdrawProceeds() external nonReentrant {
        uint256 amount = _pendingProceeds[msg.sender];
        require(amount > 0, "SecondaryMarketplace: nothing to withdraw");
        _pendingProceeds[msg.sender] = 0;
        _paymentToken.safeTransfer(msg.sender, amount);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        if (!_listingExists[listingId]) revert ListingNotActive(listingId);
        return _listings[listingId];
    }

    function _getActiveListing(uint256 listingId) private view returns (Listing storage listing) {
        if (!_listingExists[listingId]) revert ListingNotActive(listingId);
        listing = _listings[listingId];
        if (!listing.active) revert ListingNotActive(listingId);
    }
}
