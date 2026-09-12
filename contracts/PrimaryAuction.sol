// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAssetRegistryAuction {
    enum DesignStatus {
        None,
        Submitted,
        RevisionRequired,
        Verified,
        Ineligible,
        VotingEligible,
        Selected,
        AgreementRecorded,
        InProduction,
        TechnicalReview,
        ReworkRequired,
        MarketReady,
        AuctionOpen,
        EntitlementIssued,
        Suspended,
        Cancelled
    }

    struct DesignRecord {
        address creator;
        string metadataURI;
        bytes32 artworkHash;
        bytes32 aiDisclosureHash;
        bytes32 provenanceHash;
        bytes32 verificationReportHash;
        bytes32 publisherReviewHash;
        bytes32 agreementHash;
        DesignStatus status;
        bool verified;
        bool publisherEligible;
        bool agreementRecorded;
        bool suspended;
    }

    function getDesign(uint256 designId) external view returns (DesignRecord memory);
    function isVerified(uint256 designId) external view returns (bool);
    function isPublisherEligible(uint256 designId) external view returns (bool);
    function hasAgreement(uint256 designId) external view returns (bool);
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

interface ICommunityVotingAuction {
    function isVotingWinner(uint256 designId) external view returns (bool);
}

interface ICompatibilityRegistryAuction {
    function isTechnicallyApproved(uint256 designId) external view returns (bool);
    function getMaxSupply(uint256 designId) external view returns (uint256);
}

interface ISkinEntitlementAuction {
    function mint(
        address to,
        uint256 designId,
        uint256 tokenId,
        uint256 amount,
        string calldata metadataURI
    ) external;
    function totalSupply(uint256 tokenId) external view returns (uint256);
}

/// @notice Primary auction with token escrow, pull refunds and pull proceeds.
contract PrimaryAuction is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum AuctionStatus {
        None,
        Scheduled,
        Open,
        Settled,
        Unsold,
        Cancelled
    }

    struct Auction {
        uint256 designId;
        uint256 reservePrice;
        uint256 minimumIncrement;
        uint64 startTime;
        uint64 endTime;
        address highestBidder;
        uint256 highestBid;
        AuctionStatus status;
    }

    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");

    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant PUBLISHER_PRIMARY_BPS = 1_000;
    uint256 private constant MARKETPLACE_PRIMARY_BPS = 1_000;
    bytes32 private constant ARTIST_PRIMARY = keccak256("ARTIST_PRIMARY");
    bytes32 private constant PUBLISHER_PRIMARY = keccak256("PUBLISHER_PRIMARY");
    bytes32 private constant MARKETPLACE_PRIMARY = keccak256("MARKETPLACE_PRIMARY");

    IAssetRegistryAuction private immutable _assetRegistry;
    ICommunityVotingAuction private immutable _communityVoting;
    ICompatibilityRegistryAuction private immutable _compatibilityRegistry;
    IERC20 private immutable _paymentToken;
    ISkinEntitlementAuction private immutable _entitlement;
    address private immutable _publisherTreasury;
    address private immutable _marketplaceTreasury;

    uint256 private _nextAuctionId = 1;
    mapping(uint256 => Auction) private _auctions;
    mapping(uint256 => bool) private _auctionExists;
    mapping(uint256 => mapping(address => uint256)) private _pendingReturns;
    mapping(address => uint256) private _pendingProceeds;
    mapping(uint256 => bool) private _activeAuctionByDesign;

    error UnauthorizedRole(bytes32 requiredRole, address caller);
    error NotMarketReady(uint256 designId);
    error AuctionNotActive(uint256 auctionId);
    error AuctionStillOpen(uint256 auctionId);
    error BidBelowMinimum(uint256 minimumRequired, uint256 submitted);
    error CreatorCannotBid(address creator);
    error ReserveNotMet(uint256 reservePrice, uint256 highestBid);
    error AlreadySettled(uint256 auctionId);
    error NothingToWithdraw(address account);
    error DesignIsSuspended(uint256 designId);
    error InvalidBpsTotal(uint256 totalBps);

    event AuctionCreated(
        uint256 indexed auctionId,
        uint256 indexed designId,
        uint256 reservePrice,
        uint256 minimumIncrement,
        uint64 startTime,
        uint64 endTime
    );
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event RefundAvailable(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event RefundWithdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionSettled(
        uint256 indexed auctionId,
        uint256 indexed designId,
        address indexed winner,
        uint256 finalPrice
    );
    event AuctionCancelled(
        uint256 indexed auctionId,
        uint256 indexed designId,
        address indexed cancelledBy
    );
    event AuctionClosedUnsold(
        uint256 indexed auctionId,
        uint256 indexed designId,
        address indexed highestBidder,
        uint256 highestBid
    );
    event ProceedsAvailable(address indexed recipient, uint256 amount, bytes32 indexed revenueType);
    event ProceedsWithdrawn(address indexed recipient, uint256 amount);

    modifier requiresRole(bytes32 requiredRole) {
        if (!hasRole(requiredRole, _msgSender())) {
            revert UnauthorizedRole(requiredRole, _msgSender());
        }
        _;
    }

    constructor(
        address assetRegistryAddress,
        address communityVotingAddress,
        address compatibilityRegistryAddress,
        address paymentTokenAddress,
        address entitlementAddress,
        address publisherTreasuryAddress,
        address marketplaceTreasuryAddress
    ) {
        require(assetRegistryAddress != address(0), "PrimaryAuction: zero asset registry");
        require(communityVotingAddress != address(0), "PrimaryAuction: zero voting registry");
        require(compatibilityRegistryAddress != address(0), "PrimaryAuction: zero compatibility registry");
        require(paymentTokenAddress != address(0), "PrimaryAuction: zero payment token");
        require(entitlementAddress != address(0), "PrimaryAuction: zero entitlement");
        require(publisherTreasuryAddress != address(0), "PrimaryAuction: zero publisher treasury");
        require(marketplaceTreasuryAddress != address(0), "PrimaryAuction: zero marketplace treasury");

        _assetRegistry = IAssetRegistryAuction(assetRegistryAddress);
        _communityVoting = ICommunityVotingAuction(communityVotingAddress);
        _compatibilityRegistry = ICompatibilityRegistryAuction(compatibilityRegistryAddress);
        _paymentToken = IERC20(paymentTokenAddress);
        _entitlement = ISkinEntitlementAuction(entitlementAddress);
        _publisherTreasury = publisherTreasuryAddress;
        _marketplaceTreasury = marketplaceTreasuryAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function createAuction(
        uint256 designId,
        uint256 reservePrice,
        uint256 minimumIncrement,
        uint64 startTime,
        uint64 endTime
    ) external requiresRole(PUBLISHER_ROLE) returns (uint256 auctionId) {
        require(reservePrice > 0, "PrimaryAuction: zero reserve");
        require(minimumIncrement > 0, "PrimaryAuction: zero increment");
        require(startTime < endTime, "PrimaryAuction: invalid window");
        require(uint256(endTime) > block.timestamp, "PrimaryAuction: end not future");
        require(!_activeAuctionByDesign[designId], "PrimaryAuction: active auction exists");

        if (_assetRegistry.isSuspended(designId)) revert DesignIsSuspended(designId);
        uint256 maxSupply = _compatibilityRegistry.getMaxSupply(designId);
        if (
            !_assetRegistry.isVerified(designId) ||
            !_assetRegistry.isPublisherEligible(designId) ||
            !_communityVoting.isVotingWinner(designId) ||
            !_assetRegistry.hasAgreement(designId) ||
            !_compatibilityRegistry.isTechnicallyApproved(designId) ||
            maxSupply == 0 ||
            _entitlement.totalSupply(designId) >= maxSupply
        ) revert NotMarketReady(designId);

        (, uint16 artistPrimaryShareBps, , bool recorded) = _assetRegistry.getCommercialTerms(designId);
        if (!recorded) revert NotMarketReady(designId);
        _validatePrimaryBps(artistPrimaryShareBps);

        auctionId = _nextAuctionId++;
        AuctionStatus status = uint256(startTime) > block.timestamp
            ? AuctionStatus.Scheduled
            : AuctionStatus.Open;
        _auctions[auctionId] = Auction({
            designId: designId,
            reservePrice: reservePrice,
            minimumIncrement: minimumIncrement,
            startTime: startTime,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            status: status
        });
        _auctionExists[auctionId] = true;
        _activeAuctionByDesign[designId] = true;
        emit AuctionCreated(auctionId, designId, reservePrice, minimumIncrement, startTime, endTime);
    }

    function placeBid(uint256 auctionId, uint256 amount) external nonReentrant {
        Auction storage auction = _getActiveAuction(auctionId);
        if (
            block.timestamp < uint256(auction.startTime) ||
            block.timestamp >= uint256(auction.endTime)
        ) revert AuctionNotActive(auctionId);
        if (_assetRegistry.isSuspended(auction.designId)) {
            revert DesignIsSuspended(auction.designId);
        }

        IAssetRegistryAuction.DesignRecord memory design = _assetRegistry.getDesign(auction.designId);
        if (_msgSender() == design.creator) revert CreatorCannotBid(design.creator);

        uint256 minimumRequired = auction.highestBidder == address(0)
            ? auction.minimumIncrement
            : auction.highestBid + auction.minimumIncrement;
        if (amount < minimumRequired) revert BidBelowMinimum(minimumRequired, amount);

        address previousBidder = auction.highestBidder;
        uint256 previousBid = auction.highestBid;
        _paymentToken.safeTransferFrom(_msgSender(), address(this), amount);

        if (auction.status == AuctionStatus.Scheduled) auction.status = AuctionStatus.Open;
        if (previousBidder != address(0)) {
            _pendingReturns[auctionId][previousBidder] += previousBid;
            emit RefundAvailable(auctionId, previousBidder, previousBid);
        }
        auction.highestBidder = _msgSender();
        auction.highestBid = amount;
        emit BidPlaced(auctionId, _msgSender(), amount);
    }

    function withdrawRefund(uint256 auctionId) external nonReentrant {
        uint256 amount = _pendingReturns[auctionId][_msgSender()];
        if (amount == 0) revert NothingToWithdraw(_msgSender());
        _pendingReturns[auctionId][_msgSender()] = 0;
        _paymentToken.safeTransfer(_msgSender(), amount);
        emit RefundWithdrawn(auctionId, _msgSender(), amount);
    }

    function settle(uint256 auctionId) external nonReentrant {
        if (!_auctionExists[auctionId]) revert AuctionNotActive(auctionId);
        Auction storage auction = _auctions[auctionId];
        if (block.timestamp < uint256(auction.endTime)) revert AuctionStillOpen(auctionId);
        if (_isTerminal(auction.status)) revert AlreadySettled(auctionId);
        if (_assetRegistry.isSuspended(auction.designId)) {
            revert DesignIsSuspended(auction.designId);
        }

        if (auction.highestBidder == address(0) || auction.highestBid < auction.reservePrice) {
            _closeUnsold(auctionId, auction);
            return;
        }
        _settleSold(auctionId, auction);
    }

    function cancelAuction(uint256 auctionId) external {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) && !hasRole(PUBLISHER_ROLE, _msgSender())) {
            revert UnauthorizedRole(PUBLISHER_ROLE, _msgSender());
        }
        if (!_auctionExists[auctionId]) revert AuctionNotActive(auctionId);
        Auction storage auction = _auctions[auctionId];
        if (_isTerminal(auction.status)) revert AlreadySettled(auctionId);

        auction.status = AuctionStatus.Cancelled;
        _activeAuctionByDesign[auction.designId] = false;
        if (auction.highestBidder != address(0)) {
            _pendingReturns[auctionId][auction.highestBidder] += auction.highestBid;
            emit RefundAvailable(auctionId, auction.highestBidder, auction.highestBid);
        }
        emit AuctionCancelled(auctionId, auction.designId, _msgSender());
    }

    function withdrawProceeds() external nonReentrant {
        uint256 amount = _pendingProceeds[_msgSender()];
        if (amount == 0) revert NothingToWithdraw(_msgSender());
        _pendingProceeds[_msgSender()] = 0;
        _paymentToken.safeTransfer(_msgSender(), amount);
        emit ProceedsWithdrawn(_msgSender(), amount);
    }

    function pendingReturns(uint256 auctionId, address bidder) external view returns (uint256) {
        return _pendingReturns[auctionId][bidder];
    }

    function pendingProceeds(address recipient) external view returns (uint256) {
        return _pendingProceeds[recipient];
    }

    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        if (!_auctionExists[auctionId]) revert AuctionNotActive(auctionId);
        return _auctions[auctionId];
    }

    function _getActiveAuction(uint256 auctionId) private view returns (Auction storage auction) {
        if (!_auctionExists[auctionId]) revert AuctionNotActive(auctionId);
        auction = _auctions[auctionId];
        if (auction.status != AuctionStatus.Scheduled && auction.status != AuctionStatus.Open) {
            revert AuctionNotActive(auctionId);
        }
    }

    function _settleSold(uint256 auctionId, Auction storage auction) private {
        uint256 designId = auction.designId;
        if (!_assetRegistry.hasAgreement(designId) || !_compatibilityRegistry.isTechnicallyApproved(designId)) {
            revert NotMarketReady(designId);
        }
        IAssetRegistryAuction.DesignRecord memory design = _assetRegistry.getDesign(designId);
        (address artist, uint16 artistPrimaryShareBps, , bool recorded) =
            _assetRegistry.getCommercialTerms(designId);
        if (!recorded || artist == address(0)) revert NotMarketReady(designId);
        _validatePrimaryBps(artistPrimaryShareBps);

        uint256 artistAmount = (auction.highestBid * uint256(artistPrimaryShareBps)) / BPS_DENOMINATOR;
        uint256 publisherAmount = (auction.highestBid * PUBLISHER_PRIMARY_BPS) / BPS_DENOMINATOR;
        uint256 marketplaceAmount = auction.highestBid - artistAmount - publisherAmount;

        auction.status = AuctionStatus.Settled;
        _activeAuctionByDesign[designId] = false;
        _pendingProceeds[artist] += artistAmount;
        _pendingProceeds[_publisherTreasury] += publisherAmount;
        _pendingProceeds[_marketplaceTreasury] += marketplaceAmount;

        _entitlement.mint(
            auction.highestBidder,
            designId,
            designId,
            1,
            design.metadataURI
        );

        emit ProceedsAvailable(artist, artistAmount, ARTIST_PRIMARY);
        emit ProceedsAvailable(_publisherTreasury, publisherAmount, PUBLISHER_PRIMARY);
        emit ProceedsAvailable(_marketplaceTreasury, marketplaceAmount, MARKETPLACE_PRIMARY);
        emit AuctionSettled(auctionId, designId, auction.highestBidder, auction.highestBid);
    }

    function _closeUnsold(uint256 auctionId, Auction storage auction) private {
        auction.status = AuctionStatus.Unsold;
        _activeAuctionByDesign[auction.designId] = false;
        if (auction.highestBidder != address(0)) {
            _pendingReturns[auctionId][auction.highestBidder] += auction.highestBid;
            emit RefundAvailable(auctionId, auction.highestBidder, auction.highestBid);
        }
        emit AuctionClosedUnsold(
            auctionId,
            auction.designId,
            auction.highestBidder,
            auction.highestBid
        );
    }

    function _validatePrimaryBps(uint16 artistPrimaryShareBps) private pure {
        uint256 totalBps = uint256(artistPrimaryShareBps) +
            PUBLISHER_PRIMARY_BPS +
            MARKETPLACE_PRIMARY_BPS;
        if (totalBps != BPS_DENOMINATOR) revert InvalidBpsTotal(totalBps);
    }

    function _isTerminal(AuctionStatus status) private pure returns (bool) {
        return status == AuctionStatus.Settled ||
            status == AuctionStatus.Unsold ||
            status == AuctionStatus.Cancelled;
    }
}
