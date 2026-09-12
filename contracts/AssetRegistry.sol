// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface ICommunityVotingWinner {
    function isVotingWinner(uint256 designId) external view returns (bool);
}

/// @notice Stores authoritative design-review and commercial-agreement facts.
contract AssetRegistry is AccessControl {
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

    struct CommercialTerms {
        uint16 artistPrimaryShareBps;
        uint16 artistResaleRoyaltyBps;
        bool recorded;
    }

    bytes32 public constant ARTIST_ROLE = keccak256("ARTIST_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");

    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant PUBLISHER_PRIMARY_BPS = 1_000;
    uint256 private constant MARKETPLACE_PRIMARY_BPS = 1_000;
    uint256 private constant PUBLISHER_RESALE_BPS = 300;
    uint256 private constant MARKETPLACE_RESALE_BPS = 200;

    uint256 private _nextDesignId = 1;
    mapping(uint256 => DesignRecord) private _designs;
    mapping(uint256 => CommercialTerms) private _commercialTerms;
    mapping(uint256 => DesignStatus) private _statusBeforeSuspension;
    ICommunityVotingWinner private _communityVoting;

    error UnauthorizedRole(bytes32 requiredRole, address caller);
    error DesignNotFound(uint256 designId);
    error InvalidStateTransition(
        uint256 designId,
        DesignStatus current,
        DesignStatus requested
    );
    error DesignIsSuspended(uint256 designId);
    error InvalidBpsTotal(uint256 totalBps);
    error InvalidContractAddress(address supplied);
    error DependencyAlreadyConfigured(address current);

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
    event CommunityVotingUpdated(
        address indexed previousVoting,
        address indexed newVoting
    );

    modifier requiresRole(bytes32 requiredRole) {
        if (!hasRole(requiredRole, _msgSender())) {
            revert UnauthorizedRole(requiredRole, _msgSender());
        }
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function submitDesign(
        string calldata metadataURI,
        bytes32 artworkHash,
        bytes32 aiDisclosureHash,
        bytes32 provenanceHash
    ) external requiresRole(ARTIST_ROLE) returns (uint256 designId) {
        require(bytes(metadataURI).length != 0, "AssetRegistry: empty metadata URI");
        require(artworkHash != bytes32(0), "AssetRegistry: empty artwork hash");
        require(aiDisclosureHash != bytes32(0), "AssetRegistry: empty AI disclosure hash");
        require(provenanceHash != bytes32(0), "AssetRegistry: empty provenance hash");

        designId = _nextDesignId;
        _nextDesignId += 1;

        DesignRecord storage design = _designs[designId];
        design.creator = _msgSender();
        design.metadataURI = metadataURI;
        design.artworkHash = artworkHash;
        design.aiDisclosureHash = aiDisclosureHash;
        design.provenanceHash = provenanceHash;
        design.status = DesignStatus.Submitted;

        emit DesignSubmitted(
            designId,
            _msgSender(),
            metadataURI,
            artworkHash,
            aiDisclosureHash,
            provenanceHash
        );
    }

    function requestRevision(
        uint256 designId,
        bytes32 reasonHash
    ) external requiresRole(VERIFIER_ROLE) {
        DesignRecord storage design = _getExistingDesign(designId);
        _requireNotSuspended(designId, design);
        _requireStatus(designId, design, DesignStatus.Submitted, DesignStatus.RevisionRequired);
        design.status = DesignStatus.RevisionRequired;
        emit DesignRevisionRequested(designId, reasonHash);
    }

    function verifyDesign(
        uint256 designId,
        bytes32 reportHash
    ) external requiresRole(VERIFIER_ROLE) {
        DesignRecord storage design = _getExistingDesign(designId);
        _requireNotSuspended(designId, design);
        _requireStatus(designId, design, DesignStatus.Submitted, DesignStatus.Verified);
        require(reportHash != bytes32(0), "AssetRegistry: empty report hash");

        design.verificationReportHash = reportHash;
        design.verified = true;
        design.status = DesignStatus.Verified;
        emit DesignVerified(designId, _msgSender(), reportHash);
    }

    function approveConceptEligibility(
        uint256 designId,
        bytes32 reviewHash
    ) external requiresRole(PUBLISHER_ROLE) {
        DesignRecord storage design = _getExistingDesign(designId);
        _requireNotSuspended(designId, design);
        _requireStatus(designId, design, DesignStatus.Verified, DesignStatus.VotingEligible);
        require(design.verified, "AssetRegistry: design is not verified");
        require(reviewHash != bytes32(0), "AssetRegistry: empty review hash");

        design.publisherReviewHash = reviewHash;
        design.publisherEligible = true;
        design.status = DesignStatus.VotingEligible;
        emit ConceptEligibilityUpdated(designId, _msgSender(), true, reviewHash);
    }

    function recordAgreement(
        uint256 designId,
        bytes32 agreementHash,
        uint16 artistPrimaryShareBps,
        uint16 artistResaleRoyaltyBps
    ) external requiresRole(PUBLISHER_ROLE) {
        DesignRecord storage design = _getExistingDesign(designId);
        _requireNotSuspended(designId, design);
        _requireStatus(
            designId,
            design,
            DesignStatus.VotingEligible,
            DesignStatus.AgreementRecorded
        );
        require(design.publisherEligible, "AssetRegistry: design is not publisher eligible");

        if (address(_communityVoting) == address(0)) {
            revert InvalidContractAddress(address(0));
        }
        if (!_communityVoting.isVotingWinner(designId)) {
            revert InvalidStateTransition(designId, design.status, DesignStatus.Selected);
        }
        require(agreementHash != bytes32(0), "AssetRegistry: empty agreement hash");

        uint256 primaryTotal = uint256(artistPrimaryShareBps) +
            PUBLISHER_PRIMARY_BPS +
            MARKETPLACE_PRIMARY_BPS;
        if (primaryTotal != BPS_DENOMINATOR) {
            revert InvalidBpsTotal(primaryTotal);
        }

        uint256 resaleTotal = uint256(artistResaleRoyaltyBps) +
            PUBLISHER_RESALE_BPS +
            MARKETPLACE_RESALE_BPS;
        if (resaleTotal >= BPS_DENOMINATOR) {
            revert InvalidBpsTotal(resaleTotal);
        }

        design.agreementHash = agreementHash;
        design.agreementRecorded = true;
        design.status = DesignStatus.AgreementRecorded;
        _commercialTerms[designId] = CommercialTerms({
            artistPrimaryShareBps: artistPrimaryShareBps,
            artistResaleRoyaltyBps: artistResaleRoyaltyBps,
            recorded: true
        });

        emit AgreementRecorded(
            designId,
            agreementHash,
            artistPrimaryShareBps,
            artistResaleRoyaltyBps
        );
    }

    function suspendDesign(
        uint256 designId,
        bytes32 reasonHash
    ) external requiresRole(DEFAULT_ADMIN_ROLE) {
        DesignRecord storage design = _getExistingDesign(designId);
        _requireNotSuspended(designId, design);

        _statusBeforeSuspension[designId] = design.status;
        design.suspended = true;
        design.status = DesignStatus.Suspended;
        emit DesignSuspended(designId, reasonHash);
    }

    function reinstateDesign(
        uint256 designId
    ) external requiresRole(DEFAULT_ADMIN_ROLE) {
        DesignRecord storage design = _getExistingDesign(designId);
        if (!design.suspended) {
            revert InvalidStateTransition(
                designId,
                design.status,
                DesignStatus.Suspended
            );
        }

        DesignStatus restoredStatus = _statusBeforeSuspension[designId];
        design.status = restoredStatus;
        design.suspended = false;
        delete _statusBeforeSuspension[designId];
        emit DesignReinstated(designId);
    }

    function setCommunityVoting(
        address votingContract
    ) external requiresRole(DEFAULT_ADMIN_ROLE) {
        if (votingContract == address(0)) {
            revert InvalidContractAddress(votingContract);
        }

        address current = address(_communityVoting);
        if (current != address(0)) {
            revert DependencyAlreadyConfigured(current);
        }

        emit CommunityVotingUpdated(current, votingContract);
        _communityVoting = ICommunityVotingWinner(votingContract);
    }

    function getCommercialTerms(
        uint256 designId
    )
        external
        view
        returns (
            address artist,
            uint16 artistPrimaryShareBps,
            uint16 artistResaleRoyaltyBps,
            bool recorded
        )
    {
        DesignRecord storage design = _getExistingDesign(designId);
        CommercialTerms storage terms = _commercialTerms[designId];
        return (
            design.creator,
            terms.artistPrimaryShareBps,
            terms.artistResaleRoyaltyBps,
            terms.recorded
        );
    }

    function getDesign(
        uint256 designId
    ) external view returns (DesignRecord memory) {
        return _getExistingDesign(designId);
    }

    function isVerified(uint256 designId) external view returns (bool) {
        return _getExistingDesign(designId).verified;
    }

    function isPublisherEligible(
        uint256 designId
    ) external view returns (bool) {
        return _getExistingDesign(designId).publisherEligible;
    }

    function hasAgreement(uint256 designId) external view returns (bool) {
        return _getExistingDesign(designId).agreementRecorded;
    }

    function isSuspended(uint256 designId) external view returns (bool) {
        return _getExistingDesign(designId).suspended;
    }

    function _getExistingDesign(
        uint256 designId
    ) private view returns (DesignRecord storage design) {
        design = _designs[designId];
        if (design.creator == address(0)) {
            revert DesignNotFound(designId);
        }
    }

    function _requireNotSuspended(
        uint256 designId,
        DesignRecord storage design
    ) private view {
        if (design.suspended) {
            revert DesignIsSuspended(designId);
        }
    }

    function _requireStatus(
        uint256 designId,
        DesignRecord storage design,
        DesignStatus required,
        DesignStatus requested
    ) private view {
        if (design.status != required) {
            revert InvalidStateTransition(designId, design.status, requested);
        }
    }
}
