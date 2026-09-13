// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Records hashes and approval state; it does not store proprietary 3D game files.
abstract contract CompatibilityRegistry {
    enum QaStatus { None, Pending, Approved, ReworkRequired, Rejected }

    struct ProductionRecord {
        bytes32 productionHash;
        bytes32 compatibilityHash;
        bytes32 approvedGameHash;
        string version;
        uint256 maxSupply;
        QaStatus qaStatus;
    }

    error UnauthorizedRole(bytes32 requiredRole, address caller);
    error MissingAgreement(uint256 designId);
    error InvalidMaxSupply(uint256 maxSupply);
    error DesignIsSuspended(uint256 designId);
    error ProductionNotFound(uint256 designId);

    event ProductionSubmitted(
        uint256 indexed designId,
        bytes32 productionHash,
        bytes32 compatibilityHash,
        string version
    );
    event CompatibilityApproved(
        uint256 indexed designId,
        address indexed gameDeveloper,
        bytes32 approvedGameHash,
        uint256 maxSupply
    );
    event ReworkRequired(uint256 indexed designId, bytes32 indexed reasonHash);

    function submitProduction(
        uint256 designId,
        bytes32 productionHash,
        bytes32 compatibilityHash,
        string calldata version
    ) external virtual;

    function approveCompatibility(
        uint256 designId,
        bytes32 approvedGameHash,
        uint256 maxSupply
    ) external virtual;

    function requireRework(uint256 designId, bytes32 reasonHash) external virtual;
    function isTechnicallyApproved(uint256 designId) external view virtual returns (bool);
    function getMaxSupply(uint256 designId) external view virtual returns (uint256);
    function getProduction(uint256 designId) external view virtual returns (ProductionRecord memory);
}
