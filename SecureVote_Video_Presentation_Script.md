# SecureVote — Technical Video Presentation Script

**Target duration:** 3–4 minutes
**Presentation:** 7 slides — title, contents, and five technical content slides.

## Slide 1 — Title | 0:00–0:20

“Hello. This is **SecureVote**, a blockchain-based campus election system using a Solidity smart contract and a commit–reveal voting protocol.

The goal is to provide contract-enforced eligibility, temporary ballot secrecy during voting, and a publicly verifiable final tally.”

## Slide 2 — Contents | 0:20–0:30

“I will cover the problem statement, the adopted platform and language, the implemented modules, the six-month development timeline, and application screenshots.”

## Slide 3 — Objective problem statement | 0:30–1:05

“Traditional campus elections and simple online polls have three weaknesses: tampering may be difficult to detect, partial results can influence later voters, and voters usually cannot independently verify that their ballot was counted.

SecureVote addresses this with an on-chain election lifecycle. The administrator registers eligible wallet addresses. During the commit phase, a voter submits only a cryptographic commitment. During the reveal phase, the voter submits the original candidate and secret. The contract recomputes the commitment and counts the vote only when it matches.

This provides delayed disclosure and auditability. It does not provide permanent anonymity: wallet addresses and reveal transactions remain public.”

## Slide 4 — Platform and language | 1:05–1:40

“The primary platform is **Ethereum**, with **Sepolia** as the public testnet target. The contract uses **Solidity version 0.8 or later**, OpenZeppelin’s `Ownable2Step`, and custom errors.

The contract stores election configuration, candidates, voter status, commitments, and final vote counts. React and Ethers.js provide the frontend. MetaMask supplies the wallet and signer. Hardhat supports local deployment and automated tests, while Remix supports browser-based compilation and inspection.

The commitment formula is:

`keccak256(abi.encode(electionId, voter, candidateId, secret))`

The voter’s choice and secret are not stored on-chain during commit. Results are unavailable until `finalizeElection` is called after the reveal deadline.”

## Slide 5 — Modules | 1:40–2:25

“The application has five main modules.

First, the **MetaMask and network gate** accepts only MetaMask and blocks protected routes on the wrong chain. Second, the **administrator console** verifies `owner()` before allowing election creation or voter registration.

Third, the **commit workflow** generates a secure browser secret, computes the hash, asks MetaMask to sign the transaction, and allows the voter to save a receipt. Fourth, the **reveal and finalization workflow** recomputes the hash, rejects mismatches, counts valid reveals, and excludes non-revealed commitments.

Fifth, the **audit and guided-mode module** reads contract events, block numbers, and transaction hashes and explains the lifecycle to users.

Security controls include one commitment and one reveal per voter, candidate and phase validation, registration only before the election starts, bounded batch registration, no personal information on-chain, no plaintext secrets in events, and permissionless finalization.”

## Slide 6 — Timeline | 2:25–2:55

“The proposed six-month plan is staged as verification gates.

Month one covers requirements and threat modeling. Month two implements the contract and unit tests. Month three connects the React frontend to a local Hardhat deployment. Month four integrates commit–reveal, MetaMask gating, and receipts. Month five adds the audit page, guided mode, documentation, and accessibility polish. Month six completes testing, security checks, Sepolia deployment support, and the final demonstration.

The current build represents the integrated MVP across these areas.”

## Slide 7 — Implemented screens | 2:55–3:40

“These are real screenshots from the implemented application running against a local Hardhat deployment.

The **elections dashboard** reads the current election from the configured contract. The **election detail page** shows candidates, lifecycle phase, eligibility status, and the election record. The **admin console** exposes controls only after verifying the on-chain owner.

The **guided mode** explains the commit–reveal process using live wallet and network state. The **wallet checkpoint** prevents access to protected routes until MetaMask is connected to the configured chain.

The frontend does not use fabricated elections, mock vote counts, fake transaction hashes, or in-memory production storage. After a confirmed transaction, it refreshes state from the contract. The same configuration supports a real Sepolia deployment when an actual contract address and RPC endpoint are supplied.”

## Closing | 3:40–4:00

“SecureVote demonstrates a practical blockchain architecture for small institutional elections: Solidity enforces the rules, MetaMask authenticates the transaction signer, commit–reveal delays ballot disclosure, and contract events provide an audit trail.

The main limitations are that voter registration is administrator-controlled, lost secrets cannot be recovered, and reveal transactions are public. A production election would still require an independent smart-contract audit, privacy review, operational procedures, and formal election governance.

Thank you.”

## Technical terms to emphasize

Say these terms clearly during recording: **Ethereum Sepolia testnet**, **Solidity 0.8.x**, **OpenZeppelin Ownable2Step**, **Ethers.js BrowserProvider**, **Keccak-256 commitment**, **commit phase**, **reveal phase**, **finalization**, **custom errors**, **bounded batch registration**, and **public audit trail**.
