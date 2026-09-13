// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IAssetRegistryVoting {
    function isVerified(uint256 designId) external view returns (bool);

    function isPublisherEligible(
        uint256 designId
    ) external view returns (bool);

    function isSuspended(uint256 designId) external view returns (bool);
}

/// @notice Manages role-gated community voting over eligible designs.
contract CommunityVoting is AccessControl {
    struct VotingRound {
        uint64 startTime;
        uint64 endTime;
        uint256 winnerDesignId;
        bool finalised;
    }

    bytes32 public constant FAN_ROLE = keccak256("FAN_ROLE");

    IAssetRegistryVoting private immutable _assetRegistry;

    mapping(uint256 => VotingRound) private _rounds;
    mapping(uint256 => bool) private _roundExists;
    mapping(uint256 => uint256[]) private _roundCandidates;
    mapping(uint256 => mapping(uint256 => bool)) private _eligibleCandidates;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    mapping(uint256 => mapping(uint256 => uint256)) private _voteCounts;
    mapping(uint256 => bool) private _winningDesigns;

    error UnauthorizedRole(bytes32 requiredRole, address caller);
    error VotingNotOpen(uint256 roundId);
    error VotingStillOpen(uint256 roundId);
    error AlreadyVoted(uint256 roundId, address voter);
    error IneligibleCandidate(uint256 roundId, uint256 designId);
    error AlreadyFinalised(uint256 roundId);

    event VotingOpened(
        uint256 indexed roundId,
        uint64 startTime,
        uint64 endTime,
        uint256[] candidateDesignIds
    );
    event VoteRecorded(
        uint256 indexed roundId,
        uint256 indexed designId,
        address indexed voter
    );
    event VotingFinalized(
        uint256 indexed roundId,
        uint256 indexed winnerDesignId,
        uint256 winningVotes
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
            "CommunityVoting: zero registry"
        );

        _assetRegistry = IAssetRegistryVoting(assetRegistryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function openVoting(
        uint256 roundId,
        uint256[] calldata candidateDesignIds,
        uint64 startTime,
        uint64 endTime
    ) external requiresRole(DEFAULT_ADMIN_ROLE) {
        require(!_roundExists[roundId], "CommunityVoting: round exists");
        require(
            candidateDesignIds.length != 0,
            "CommunityVoting: no candidates"
        );
        require(startTime < endTime, "CommunityVoting: invalid window");
        require(
            uint256(endTime) > block.timestamp,
            "CommunityVoting: end not future"
        );

        for (uint256 i = 0; i < candidateDesignIds.length; i++) {
            uint256 designId = candidateDesignIds[i];

            for (uint256 j = 0; j < i; j++) {
                if (candidateDesignIds[j] == designId) {
                    revert IneligibleCandidate(roundId, designId);
                }
            }

            if (!_isEligibleDesign(designId)) {
                revert IneligibleCandidate(roundId, designId);
            }
        }

        _roundExists[roundId] = true;
        _rounds[roundId] = VotingRound({
            startTime: startTime,
            endTime: endTime,
            winnerDesignId: 0,
            finalised: false
        });

        for (uint256 i = 0; i < candidateDesignIds.length; i++) {
            uint256 designId = candidateDesignIds[i];
            _roundCandidates[roundId].push(designId);
            _eligibleCandidates[roundId][designId] = true;
        }

        emit VotingOpened(
            roundId,
            startTime,
            endTime,
            candidateDesignIds
        );
    }

    function vote(
        uint256 roundId,
        uint256 designId
    ) external requiresRole(FAN_ROLE) {
        VotingRound storage round = _rounds[roundId];
        if (
            !_roundExists[roundId] ||
            block.timestamp < uint256(round.startTime) ||
            block.timestamp >= uint256(round.endTime)
        ) {
            revert VotingNotOpen(roundId);
        }

        if (!_eligibleCandidates[roundId][designId]) {
            revert IneligibleCandidate(roundId, designId);
        }

        address voter = _msgSender();
        if (_hasVoted[roundId][voter]) {
            revert AlreadyVoted(roundId, voter);
        }

        _hasVoted[roundId][voter] = true;
        _voteCounts[roundId][designId] += 1;

        emit VoteRecorded(roundId, designId, voter);
    }

    function finalizeVoting(
        uint256 roundId
    )
        external
        requiresRole(DEFAULT_ADMIN_ROLE)
        returns (uint256 winnerDesignId)
    {
        if (!_roundExists[roundId]) {
            revert VotingNotOpen(roundId);
        }

        VotingRound storage round = _rounds[roundId];
        if (round.finalised) {
            revert AlreadyFinalised(roundId);
        }
        if (block.timestamp < uint256(round.endTime)) {
            revert VotingStillOpen(roundId);
        }

        uint256 winningVotes;
        uint256[] storage candidates = _roundCandidates[roundId];

        for (uint256 i = 0; i < candidates.length; i++) {
            uint256 designId = candidates[i];
            uint256 candidateVotes = _voteCounts[roundId][designId];

            if (
                candidateVotes > winningVotes ||
                (
                    candidateVotes == winningVotes &&
                    candidateVotes != 0 &&
                    designId < winnerDesignId
                )
            ) {
                winnerDesignId = designId;
                winningVotes = candidateVotes;
            }
        }

        round.winnerDesignId = winnerDesignId;
        round.finalised = true;

        if (winnerDesignId != 0) {
            _winningDesigns[winnerDesignId] = true;
        }

        emit VotingFinalized(roundId, winnerDesignId, winningVotes);
    }

    function hasVoted(
        uint256 roundId,
        address voter
    ) external view returns (bool) {
        return _hasVoted[roundId][voter];
    }

    function voteCount(
        uint256 roundId,
        uint256 designId
    ) external view returns (uint256) {
        return _voteCounts[roundId][designId];
    }

    function isVotingWinner(uint256 designId) external view returns (bool) {
        return designId != 0 && _winningDesigns[designId];
    }

    function getRound(
        uint256 roundId
    ) external view returns (VotingRound memory) {
        if (!_roundExists[roundId]) {
            revert VotingNotOpen(roundId);
        }

        return _rounds[roundId];
    }

    function _isEligibleDesign(
        uint256 designId
    ) private view returns (bool) {
        try _assetRegistry.isVerified(designId) returns (bool verified) {
            if (!verified) {
                return false;
            }
        } catch {
            return false;
        }

        try _assetRegistry.isPublisherEligible(designId) returns (
            bool eligible
        ) {
            if (!eligible) {
                return false;
            }
        } catch {
            return false;
        }

        try _assetRegistry.isSuspended(designId) returns (bool suspended) {
            return !suspended;
        } catch {
            return false;
        }
    }
}
