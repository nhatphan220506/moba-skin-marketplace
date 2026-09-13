// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IAssetRegistryCompatibility {
    function hasAgreement(uint256 designId) external view returns (bool);

    function isSuspended(uint256 designId) external view returns (bool);
}

/// @notice Records hashes and approval state; it does not store proprietary 3D game files.
contract CompatibilityRegistry is AccessControl {
    enum QaStatus {
        None,
        Pending,
        Approved,
        ReworkRequired,
        Rejected
    }

    struct ProductionRecord {
        bytes32 productionHash;
        bytes32 compatibilityHash;
        bytes32 approvedGameHash;
        string version;
        uint256 maxSupply;
        QaStatus qaStatus;
    }

    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");
    bytes32 public constant GAME_DEVELOPER_ROLE =
        keccak256("GAME_DEVELOPER_ROLE");

    IAssetRegistryCompatibility private immutable _assetRegistry;

    mapping(uint256 => ProductionRecord) private _productions;
    mapping(uint256 => bool) private _productionExists;

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
    event ReworkRequired(
        uint256 indexed designId,
        bytes32 indexed reasonHash
    );

    modifier requiresRole(bytes32 requiredRole) {
        if (!hasRole(requiredRole, _msgSender())) {
            revert UnauthorizedRole(requiredRole, _msgSender());
        }
        _;
    }

    constructor(address assetRegistryAddress) {
        require(
            assetRegistryAddress != address(0),
            "CompatibilityRegistry: zero registry"
        );

        _assetRegistry = IAssetRegistryCompatibility(assetRegistryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function submitProduction(
        uint256 designId,
        bytes32 productionHash,
        bytes32 compatibilityHash,
        string calldata version
    ) external requiresRole(PUBLISHER_ROLE) {
        if (!_hasAgreement(designId)) {
            revert MissingAgreement(designId);
        }
        if (_assetRegistry.isSuspended(designId)) {
            revert DesignIsSuspended(designId);
        }

        require(
            productionHash != bytes32(0),
            "CompatibilityRegistry: zero production hash"
        );
        require(
            compatibilityHash != bytes32(0),
            "CompatibilityRegistry: zero compatibility hash"
        );
        require(
            bytes(version).length != 0,
            "CompatibilityRegistry: empty version"
        );

        if (_productionExists[designId]) {
            require(
                _productions[designId].qaStatus == QaStatus.ReworkRequired,
                "CompatibilityRegistry: invalid submission state"
            );
        } else {
            _productionExists[designId] = true;
        }

        _productions[designId] = ProductionRecord({
            productionHash: productionHash,
            compatibilityHash: compatibilityHash,
            approvedGameHash: bytes32(0),
            version: version,
            maxSupply: 0,
            qaStatus: QaStatus.Pending
        });

        emit ProductionSubmitted(
            designId,
            productionHash,
            compatibilityHash,
            version
        );
    }

    function approveCompatibility(
        uint256 designId,
        bytes32 approvedGameHash,
        uint256 maxSupply
    ) external requiresRole(GAME_DEVELOPER_ROLE) {
        ProductionRecord storage production = _getExistingProduction(
            designId
        );
        require(
            production.qaStatus == QaStatus.Pending,
            "CompatibilityRegistry: invalid approval state"
        );

        if (!_hasAgreement(designId)) {
            revert MissingAgreement(designId);
        }
        if (_assetRegistry.isSuspended(designId)) {
            revert DesignIsSuspended(designId);
        }

        require(
            approvedGameHash != bytes32(0),
            "CompatibilityRegistry: zero game hash"
        );
        if (maxSupply == 0) {
            revert InvalidMaxSupply(maxSupply);
        }

        production.approvedGameHash = approvedGameHash;
        production.maxSupply = maxSupply;
        production.qaStatus = QaStatus.Approved;

        emit CompatibilityApproved(
            designId,
            _msgSender(),
            approvedGameHash,
            maxSupply
        );
    }

    function requireRework(
        uint256 designId,
        bytes32 reasonHash
    ) external requiresRole(GAME_DEVELOPER_ROLE) {
        ProductionRecord storage production = _getExistingProduction(
            designId
        );
        require(
            production.qaStatus == QaStatus.Pending,
            "CompatibilityRegistry: invalid rework state"
        );
        require(
            reasonHash != bytes32(0),
            "CompatibilityRegistry: zero reason hash"
        );

        production.approvedGameHash = bytes32(0);
        production.maxSupply = 0;
        production.qaStatus = QaStatus.ReworkRequired;

        emit ReworkRequired(designId, reasonHash);
    }

    function isTechnicallyApproved(
        uint256 designId
    ) external view returns (bool) {
        return _productions[designId].qaStatus == QaStatus.Approved;
    }

    function getMaxSupply(uint256 designId) external view returns (uint256) {
        return _productions[designId].maxSupply;
    }

    function getProduction(
        uint256 designId
    ) external view returns (ProductionRecord memory) {
        if (!_productionExists[designId]) {
            revert ProductionNotFound(designId);
        }

        return _productions[designId];
    }

    function _getExistingProduction(
        uint256 designId
    ) private view returns (ProductionRecord storage production) {
        if (!_productionExists[designId]) {
            revert ProductionNotFound(designId);
        }

        return _productions[designId];
    }

    function _hasAgreement(uint256 designId) private view returns (bool) {
        try _assetRegistry.hasAgreement(designId) returns (bool exists) {
            return exists;
        } catch {
            return false;
        }
    }
}
