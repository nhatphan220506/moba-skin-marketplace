// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice M0 interface skeleton. One wallet may vote once in each round.
abstract contract CommunityVoting {
    struct VotingRound {
        uint64 startTime;
        uint64 endTime;
        uint256 winnerDesignId;
        bool finalised;
    }

    error UnauthorizedRole(bytes32 requiredRole, address caller);
    error VotingNotOpen(uint256 roundId);
    error VotingStillOpen(uint256 roundId);
    error AlreadyVoted(uint256 roundId, address voter);
    error IneligibleCandidate(uint256 roundId, uint256 designId);
    error AlreadyFinalised(uint256 roundId);

    event VotingOpened(uint256 indexed roundId, uint64 startTime, uint64 endTime, uint256[] candidateDesignIds);
    event VoteRecorded(uint256 indexed roundId, uint256 indexed designId, address indexed voter);
    event VotingFinalized(uint256 indexed roundId, uint256 indexed winnerDesignId, uint256 winningVotes);

    function openVoting(
        uint256 roundId,
        uint256[] calldata candidateDesignIds,
        uint64 startTime,
        uint64 endTime
    ) external virtual;

    function vote(uint256 roundId, uint256 designId) external virtual;
    function finalizeVoting(uint256 roundId) external virtual returns (uint256 winnerDesignId);
    function hasVoted(uint256 roundId, address voter) external view virtual returns (bool);
    function voteCount(uint256 roundId, uint256 designId) external view virtual returns (uint256);
    function isVotingWinner(uint256 designId) external view virtual returns (bool);
    function getRound(uint256 roundId) external view virtual returns (VotingRound memory);
}
