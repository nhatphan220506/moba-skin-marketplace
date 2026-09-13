// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice M0 primary-auction interface with escrow, pull refunds and pull proceeds.
abstract contract PrimaryAuction {
    enum AuctionStatus { None, Scheduled, Open, Settled, Unsold, Cancelled }

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
    event ProceedsAvailable(address indexed recipient, uint256 amount, bytes32 indexed revenueType);
    event ProceedsWithdrawn(address indexed recipient, uint256 amount);

    function createAuction(
        uint256 designId,
        uint256 reservePrice,
        uint256 minimumIncrement,
        uint64 startTime,
        uint64 endTime
    ) external virtual returns (uint256 auctionId);

    function placeBid(uint256 auctionId, uint256 amount) external virtual;
    function withdrawRefund(uint256 auctionId) external virtual;
    function settle(uint256 auctionId) external virtual;
    function withdrawProceeds() external virtual;
    function pendingReturns(uint256 auctionId, address bidder) external view virtual returns (uint256);
    function pendingProceeds(address recipient) external view virtual returns (uint256);
    function getAuction(uint256 auctionId) external view virtual returns (Auction memory);
}
