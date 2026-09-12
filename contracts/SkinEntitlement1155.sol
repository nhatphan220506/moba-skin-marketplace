// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface IAssetRegistryEntitlement {
    function isSuspended(uint256 designId) external view returns (bool);
}

interface ICompatibilityRegistryEntitlement {
    function isTechnicallyApproved(uint256 designId) external view returns (bool);
    function getMaxSupply(uint256 designId) external view returns (uint256);
}

/// @notice Limited usage entitlement; this token is not copyright or ownership of game IP.
contract SkinEntitlement1155 is ERC1155, ERC1155Supply, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IAssetRegistryEntitlement private immutable _assetRegistry;
    ICompatibilityRegistryEntitlement private immutable _compatibilityRegistry;

    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bool) private _transferable;

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

    constructor(
        address assetRegistryAddress,
        address compatibilityRegistryAddress
    ) ERC1155("") {
        require(assetRegistryAddress != address(0), "SkinEntitlement1155: zero asset registry");
        require(
            compatibilityRegistryAddress != address(0),
            "SkinEntitlement1155: zero compatibility registry"
        );
        _assetRegistry = IAssetRegistryEntitlement(assetRegistryAddress);
        _compatibilityRegistry = ICompatibilityRegistryEntitlement(compatibilityRegistryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(
        address to,
        uint256 designId,
        uint256 tokenId,
        uint256 amount,
        string calldata metadataURI
    ) external {
        if (!hasRole(MINTER_ROLE, _msgSender())) revert UnauthorizedMinter(_msgSender());
        _requireProjectNotPaused();
        require(to != address(0), "SkinEntitlement1155: zero recipient");
        require(tokenId == designId, "SkinEntitlement1155: token/design mismatch");
        require(amount > 0, "SkinEntitlement1155: zero amount");
        require(bytes(metadataURI).length != 0, "SkinEntitlement1155: empty metadata URI");
        require(!_assetRegistry.isSuspended(designId), "SkinEntitlement1155: design suspended");
        require(
            _compatibilityRegistry.isTechnicallyApproved(designId),
            "SkinEntitlement1155: not technically approved"
        );

        uint256 maxSupply = _compatibilityRegistry.getMaxSupply(designId);
        require(maxSupply > 0, "SkinEntitlement1155: invalid max supply");
        if (totalSupply(tokenId) + amount > maxSupply) {
            revert SupplyCapExceeded(designId, maxSupply);
        }

        string storage storedURI = _tokenURIs[tokenId];
        bool firstMint = bytes(storedURI).length == 0;
        if (firstMint) {
            _tokenURIs[tokenId] = metadataURI;
        } else {
            require(
                keccak256(bytes(storedURI)) == keccak256(bytes(metadataURI)),
                "SkinEntitlement1155: URI mismatch"
            );
        }

        if (firstMint) {
            _transferable[tokenId] = true;
        }

        _mint(to, tokenId, amount, "");
        if (firstMint) emit TransferabilityUpdated(tokenId, true);
        emit EntitlementMinted(designId, tokenId, to, amount);
    }

    function authorisedTransfer(
        address from,
        address to,
        uint256 designId,
        uint256 tokenId,
        uint256 amount
    ) external {
        if (!hasRole(MARKETPLACE_ROLE, _msgSender())) {
            revert UnauthorizedMarketplace(_msgSender());
        }
        _requireProjectNotPaused();
        require(from != address(0), "SkinEntitlement1155: zero sender");
        require(to != address(0), "SkinEntitlement1155: zero recipient");
        require(from != to, "SkinEntitlement1155: same recipient");
        require(tokenId == designId, "SkinEntitlement1155: token/design mismatch");
        require(amount > 0, "SkinEntitlement1155: zero amount");
        require(_transferable[tokenId], "SkinEntitlement1155: non-transferable");
        require(!_assetRegistry.isSuspended(designId), "SkinEntitlement1155: design suspended");

        _safeTransferFrom(from, to, tokenId, amount, "");
        emit EntitlementTransferred(designId, tokenId, from, to, amount);
    }

    function setMarketplaceAuthorization(
        address marketplace,
        bool authorised
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(marketplace != address(0), "SkinEntitlement1155: zero marketplace");
        require(
            hasRole(MARKETPLACE_ROLE, marketplace) != authorised,
            "SkinEntitlement1155: authorization unchanged"
        );
        if (authorised) _grantRole(MARKETPLACE_ROLE, marketplace);
        else _revokeRole(MARKETPLACE_ROLE, marketplace);
        emit MarketplaceAuthorizationUpdated(marketplace, authorised);
    }

    function setTransferable(
        uint256 tokenId,
        bool transferable
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _transferable[tokenId] = transferable;
        emit TransferabilityUpdated(tokenId, transferable);
    }

    function pause() external {
        _requireAdminOrPauser();
        _pause();
    }

    function unpause() external {
        _requireAdminOrPauser();
        _unpause();
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function isTransferable(uint256 tokenId) external view returns (bool) {
        return _transferable[tokenId];
    }

    function safeTransferFrom(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public pure override {
        revert DirectTransferDisabled();
    }

    function safeBatchTransferFrom(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public pure override {
        revert DirectTransferDisabled();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        _requireProjectNotPaused();
        super._update(from, to, ids, values);
    }

    function _requireProjectNotPaused() private view {
        if (paused()) revert EntitlementPaused();
    }

    function _requireAdminOrPauser() private view {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) || hasRole(PAUSER_ROLE, _msgSender()),
            "SkinEntitlement1155: unauthorized pauser"
        );
    }
}
