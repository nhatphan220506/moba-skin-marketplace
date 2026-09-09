// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice M0 interface skeleton. Implementation belongs to Nhật in phase N2.
abstract contract AssetRegistry {
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

    error UnauthorizedRole(bytes32 requiredRole, address caller);
    error DesignNotFound(uint256 designId);
    error InvalidStateTransition(uint256 designId, DesignStatus current, DesignStatus requested);
    error DesignIsSuspended(uint256 designId);
    error InvalidBpsTotal(uint256 totalBps);

    event DesignSubmitted(
        uint256 indexed designId,
        address indexed artist,
        string metadataURI,
        bytes32 artworkHash,
        bytes32 aiDisclosureHash,
        bytes32 provenanceHash
    );
    event DesignRevisionRequested(uint256 indexed designId, bytes32 indexed reasonHash);
    event DesignVerified(uint256 indexed designId, address indexed verifier, bytes32 reportHash);
    event ConceptEligibilityUpdated(
        uint256 indexed designId,
        address indexed publisher,
        bool eligible,
        bytes32 reviewHash
    );
    event AgreementRecorded(
        uint256 indexed designId,
        bytes32 agreementHash,
        uint16 artistPrimaryShareBps,
        uint16 artistResaleRoyaltyBps
    );
    event DesignSuspended(uint256 indexed designId, bytes32 indexed reasonHash);
    event DesignReinstated(uint256 indexed designId);

    function submitDesign(
        string calldata metadataURI,
        bytes32 artworkHash,
        bytes32 aiDisclosureHash,
        bytes32 provenanceHash
    ) external virtual returns (uint256 designId);

    function requestRevision(uint256 designId, bytes32 reasonHash) external virtual;
    function verifyDesign(uint256 designId, bytes32 reportHash) external virtual;
    function approveConceptEligibility(uint256 designId, bytes32 reviewHash) external virtual;

    function recordAgreement(
        uint256 designId,
        bytes32 agreementHash,
        uint16 artistPrimaryShareBps,
        uint16 artistResaleRoyaltyBps
    ) external virtual;

    function suspendDesign(uint256 designId, bytes32 reasonHash) external virtual;
    function reinstateDesign(uint256 designId) external virtual;
    function getDesign(uint256 designId) external view virtual returns (DesignRecord memory);
    function isVerified(uint256 designId) external view virtual returns (bool);
    function isPublisherEligible(uint256 designId) external view virtual returns (bool);
    function hasAgreement(uint256 designId) external view virtual returns (bool);
    function isSuspended(uint256 designId) external view virtual returns (bool);
}
