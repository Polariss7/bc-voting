// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SecureVote
/// @notice Campus elections using a commitment phase followed by a reveal phase.
/// @dev Reveal transactions are public on-chain. The protocol provides delayed disclosure,
///      not permanent anonymity.
contract SecureVote is Ownable2Step {
    uint256 public constant MAX_CANDIDATES = 20;
    uint256 public constant MAX_VOTER_BATCH = 200;

    uint256 private _nextElectionId = 1;

    struct Election {
        uint256 id;
        string title;
        string description;
        uint64 commitStart;
        uint64 commitEnd;
        uint64 revealEnd;
        bool finalized;
        uint256 candidateCount;
        uint256 totalCommitted;
        uint256 totalRevealed;
    }

    struct Candidate {
        uint256 id;
        string name;
        string manifesto;
    }

    struct VoterStatus {
        bool eligible;
        bool committed;
        bool revealed;
        bytes32 commitment;
    }

    mapping(uint256 electionId => Election election) private _elections;
    mapping(uint256 electionId => Candidate[] candidates) private _candidates;
    mapping(uint256 electionId => mapping(uint256 candidateId => uint256 votes)) private _voteCounts;
    mapping(uint256 electionId => mapping(address voter => VoterStatus status)) private _voters;

    error EmptyTitle();
    error EmptyCandidates();
    error CandidateInputMismatch();
    error TooManyCandidates();
    error InvalidSchedule();
    error InvalidAddress();
    error AlreadyRegistered();
    error EmptyCommitment();
    error ElectionNotFound();
    error ElectionAlreadyFinalized();
    error ElectionAlreadyStarted();
    error NotEligible();
    error AlreadyCommitted();
    error AlreadyRevealed();
    error NotCommitPhase();
    error NotRevealPhase();
    error InvalidCandidate();
    error CommitmentMismatch();
    error NotReadyToFinalize();
    error EmptyBatch();
    error BatchTooLarge();

    event ElectionCreated(
        uint256 indexed electionId,
        string title,
        uint64 commitStart,
        uint64 commitEnd,
        uint64 revealEnd,
        uint256 candidateCount
    );
    event VoterRegistered(uint256 indexed electionId, address indexed voter);
    event VoteCommitted(uint256 indexed electionId, address indexed voter, bytes32 commitment);
    event VoteRevealed(uint256 indexed electionId, address indexed voter, uint256 indexed candidateId);
    event ElectionFinalized(uint256 indexed electionId, uint256 totalRevealed, uint256 nonRevealed);

    constructor() Ownable(msg.sender) {}

    function createElection(
        string calldata title,
        string calldata description,
        string[] calldata candidateNames,
        string[] calldata candidateManifestos,
        uint64 commitStart,
        uint64 commitEnd,
        uint64 revealEnd
    ) external onlyOwner returns (uint256 electionId) {
        if (bytes(title).length == 0) revert EmptyTitle();
        if (candidateNames.length == 0) revert EmptyCandidates();
        if (candidateNames.length != candidateManifestos.length) revert CandidateInputMismatch();
        if (candidateNames.length > MAX_CANDIDATES) revert TooManyCandidates();
        if (commitStart <= block.timestamp || commitStart >= commitEnd || commitEnd >= revealEnd) {
            revert InvalidSchedule();
        }

        electionId = _nextElectionId++;
        Election storage election = _elections[electionId];
        election.id = electionId;
        election.title = title;
        election.description = description;
        election.commitStart = commitStart;
        election.commitEnd = commitEnd;
        election.revealEnd = revealEnd;
        election.candidateCount = candidateNames.length;

        for (uint256 i; i < candidateNames.length; ++i) {
            _candidates[electionId].push(Candidate(i, candidateNames[i], candidateManifestos[i]));
        }

        emit ElectionCreated(electionId, title, commitStart, commitEnd, revealEnd, candidateNames.length);
    }

    function registerVoter(uint256 electionId, address voter) external onlyOwner {
        _registerVoter(electionId, voter);
    }

    function _registerVoter(uint256 electionId, address voter) internal {
        _requireElection(electionId);
        if (voter == address(0)) revert InvalidAddress();
        Election storage election = _elections[electionId];
        if (block.timestamp >= election.commitStart) revert ElectionAlreadyStarted();
        VoterStatus storage status = _voters[electionId][voter];
        if (status.eligible) revert AlreadyRegistered();
        status.eligible = true;
        emit VoterRegistered(electionId, voter);
    }

    function registerVoters(uint256 electionId, address[] calldata voters) external onlyOwner {
        if (voters.length == 0) revert EmptyBatch();
        if (voters.length > MAX_VOTER_BATCH) revert BatchTooLarge();
        for (uint256 i; i < voters.length; ++i) _registerVoter(electionId, voters[i]);
    }

    function commitVote(uint256 electionId, bytes32 commitment) external {
        Election storage election = _requireElection(electionId);
        if (block.timestamp < election.commitStart || block.timestamp >= election.commitEnd) {
            revert NotCommitPhase();
        }
        if (commitment == bytes32(0)) revert EmptyCommitment();
        VoterStatus storage status = _voters[electionId][msg.sender];
        if (!status.eligible) revert NotEligible();
        if (status.committed) revert AlreadyCommitted();
        status.committed = true;
        status.commitment = commitment;
        election.totalCommitted += 1;
        emit VoteCommitted(electionId, msg.sender, commitment);
    }

    function revealVote(uint256 electionId, uint256 candidateId, bytes32 secret) external {
        Election storage election = _requireElection(electionId);
        if (block.timestamp < election.commitEnd || block.timestamp >= election.revealEnd) {
            revert NotRevealPhase();
        }
        if (candidateId >= election.candidateCount) revert InvalidCandidate();
        VoterStatus storage status = _voters[electionId][msg.sender];
        if (!status.committed) revert NotEligible();
        if (status.revealed) revert AlreadyRevealed();

        bytes32 expected = keccak256(abi.encode(electionId, msg.sender, candidateId, secret));
        if (expected != status.commitment) revert CommitmentMismatch();

        status.revealed = true;
        election.totalRevealed += 1;
        _voteCounts[electionId][candidateId] += 1;
        emit VoteRevealed(electionId, msg.sender, candidateId);
    }

    function finalizeElection(uint256 electionId) external {
        Election storage election = _requireElection(electionId);
        if (block.timestamp < election.revealEnd) revert NotReadyToFinalize();
        if (election.finalized) revert ElectionAlreadyFinalized();
        election.finalized = true;
        emit ElectionFinalized(electionId, election.totalRevealed, election.totalCommitted - election.totalRevealed);
    }

    function getElection(uint256 electionId) external view returns (Election memory) {
        return _requireElection(electionId);
    }

    function getElectionCount() external view returns (uint256) {
        return _nextElectionId - 1;
    }

    function getCandidates(uint256 electionId) external view returns (Candidate[] memory) {
        _requireElection(electionId);
        return _candidates[electionId];
    }

    function getVoterStatus(uint256 electionId, address voter) external view returns (VoterStatus memory) {
        _requireElection(electionId);
        return _voters[electionId][voter];
    }

    function isEligible(uint256 electionId, address voter) external view returns (bool) {
        _requireElection(electionId);
        return _voters[electionId][voter].eligible;
    }

    function getElectionResults(uint256 electionId)
        external
        view
        returns (uint256[] memory candidateIds, string[] memory names, uint256[] memory counts, uint256 totalCommitted, uint256 totalRevealed, uint256 nonRevealed)
    {
        Election storage election = _requireElection(electionId);
        if (!election.finalized) revert NotReadyToFinalize();
        uint256 count = election.candidateCount;
        candidateIds = new uint256[](count);
        names = new string[](count);
        counts = new uint256[](count);
        for (uint256 i; i < count; ++i) {
            candidateIds[i] = _candidates[electionId][i].id;
            names[i] = _candidates[electionId][i].name;
            counts[i] = _voteCounts[electionId][i];
        }
        totalCommitted = election.totalCommitted;
        totalRevealed = election.totalRevealed;
        nonRevealed = election.totalCommitted - election.totalRevealed;
    }

    function _requireElection(uint256 electionId) internal view returns (Election storage election) {
        election = _elections[electionId];
        if (election.id == 0) revert ElectionNotFound();
    }
}
