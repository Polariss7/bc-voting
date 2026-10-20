# Updated voting workflow

Start with [the run and deployment guide](docs/READY-TO-RUN.md) for this source update, verification status, and the shared Sepolia election checklist.

# SecureVote

SecureVote is a blockchain-backed campus election system built around a Solidity smart contract and a commit–reveal voting protocol.

It is designed for small institutional elections such as class representatives, club committees, or fest teams. The blockchain contract is the source of truth for election configuration, voter eligibility, commitments, reveals, finalization, and audit events. The frontend does not use fake elections, mock vote counts, fabricated transaction hashes, static production JSON, or in-memory production storage.

> **Status:** capstone-quality MVP. The application supports a local Hardhat deployment and Sepolia deployment configuration. It is not a production election system or a substitute for an independent smart-contract and privacy audit.

## What the system demonstrates

- Owner-controlled election creation and voter registration.
- MetaMask-only access to protected application routes.
- Configured-network enforcement before reading or writing election state.
- Commit–reveal voting with a cryptographically generated browser secret.
- Contract verification of the original candidate, voter address, election ID, and secret.
- Results hidden until the reveal deadline has passed and anyone finalizes the election.
- Public audit evidence from contract events, block numbers, and transaction hashes.
- Guided mode explaining the lifecycle using live wallet and contract state.

The commit–reveal protocol provides **temporary ballot secrecy**, not permanent anonymity. Wallet addresses and reveal transactions are public on a public blockchain. Lost secrets cannot be recovered by the contract, and non-revealed commitments are excluded from the tally.

## Architecture

```text
MetaMask wallet
      │  BrowserProvider / signer
      ▼
React + Vite frontend ── Ethers.js ──► SecureVote.sol
                                        │
                                        ▼
                              Ethereum local / Sepolia
```

There is no centralized application database in version one. The frontend reads and writes through the connected MetaMask `BrowserProvider`. A configured RPC URL may be used by deployment tooling, but it cannot bypass the wallet gate or unlock protected routes.

### Commit–reveal lifecycle

1. The administrator creates an election and registers eligible wallet addresses.
2. During the commit window, an eligible voter chooses a candidate and generates a secret locally with `crypto.getRandomValues()`.
3. The browser computes:

   ```text
   keccak256(abi.encode(electionId, voterAddress, candidateId, secret))
   ```

4. The voter submits only the commitment hash in the commit transaction.
5. During the reveal window, the voter submits the candidate ID and original secret.
6. The contract recomputes the hash, verifies the commitment, and increments the candidate count.
7. After the reveal deadline, anyone can finalize the election. Only then are results readable.

## Technology stack

| Layer            | Technology                        | Purpose                                                   |
| ---------------- | --------------------------------- | --------------------------------------------------------- |
| Blockchain       | Ethereum Sepolia / Hardhat local  | Public testnet target and deterministic local development |
| Smart contract   | Solidity `0.8.24`                 | Election lifecycle and commit–reveal rules                |
| Security library | OpenZeppelin Contracts            | `Ownable2Step` ownership control                          |
| Frontend         | React, TypeScript, Vite           | Responsive election interface                             |
| Web3 client      | Ethers.js v6                      | Contract reads, signers, transactions, and receipts       |
| Wallet           | MetaMask                          | Wallet authentication and transaction signing             |
| Development      | Hardhat, Remix                    | Local deployment, testing, and browser inspection         |
| Verification     | Vitest, Solhint, ESLint, Prettier | Frontend tests and code-quality checks                    |

## Prerequisites

- Node.js 20 or newer.
- npm 10 or newer.
- MetaMask browser extension for protected routes.
- Sepolia ETH only when deploying or demonstrating on Sepolia.

## Quick start: local Hardhat demo

From the repository root:

```bash
npm install
npx hardhat node
```

In a second terminal, deploy the contract:

```bash
npm run deploy:local
```

For a ready-to-use demonstration election, run:

```bash
npm run demo
```

The demo script uses real local-chain transactions and creates a short election schedule. It prints the deployed address, election ID, owner, registered voters, and timestamps.

Create `.env.local` in the repository root. The file is ignored by Git:

```dotenv
VITE_CONTRACT_ADDRESS=<address printed by deploy:local or demo>
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545
VITE_BLOCK_EXPLORER_URL=
```

Start the frontend:

```bash
npm run dev
```

Then:

1. Import one of the funded Hardhat accounts into MetaMask.
2. Add the local network with RPC URL `http://127.0.0.1:8545` and chain ID `31337`.
3. Open the Vite URL shown in the terminal.
4. Connect MetaMask. The landing page is public, but Elections, election details, Public audit, Admin, and voting workflows require MetaMask on the configured chain.

The local demo contract is intentionally ephemeral. Restarting the Hardhat node creates a new chain state and requires a new deployment and frontend address.

## Sepolia deployment

Never commit deployment keys, RPC credentials, or `.env.local`.

1. Create a local environment file with:

   ```dotenv
   SEPOLIA_RPC_URL=<your Sepolia RPC endpoint>
   DEPLOYER_PRIVATE_KEY=<funded deployer key>
   ETHERSCAN_API_KEY=<optional verification key>
   VITE_CONTRACT_ADDRESS=
   VITE_CHAIN_ID=11155111
   VITE_RPC_URL=
   VITE_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
   ```

2. Fund the deployer with Sepolia ETH.
3. Deploy:

   ```bash
   npm run deploy:sepolia
   ```

4. Copy the confirmed contract address into `VITE_CONTRACT_ADDRESS`.
5. Run `npm run dev` and connect MetaMask to Ethereum Sepolia.

The deployment script writes a network-specific JSON file under `frontend/src/config/deployments/`; those generated files are ignored by Git. Contract verification can be performed with the appropriate Hardhat verification command after deployment if an Etherscan key is configured.

## Verification commands

Run the full local quality gate:

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
npm run security:check
npm run build
npm audit --omit=dev --audit-level=high
```

Additional commands:

```bash
npm run test:contracts
npm run test:frontend
npm run coverage
```

The contract suite covers lifecycle rules, authorization, duplicate actions, replay resistance, invalid reveals, hidden results, finalization, multiple elections, ownership transfer, candidate immutability, and voter immutability after an election starts. The frontend suite covers wallet gating, wrong networks, account changes, transaction failures, missing configuration, invalid receipts, and RPC-unavailable states.

## Security model

The contract uses Solidity checked arithmetic, custom errors, strict phase validation, `Ownable2Step`, bounded batch registration, and event emission for state transitions. It does not use `tx.origin`, unsafe assembly, blockchain randomness, delegatecall, plaintext secrets in events, or payable/token incentives.

Important trust and privacy boundaries:

- Voter registration is administrator-controlled.
- Wallet addresses are public identifiers.
- Reveal transactions disclose the selected candidate to the public chain.
- A lost secret cannot be recovered by the contract.
- Non-revealed commitments do not count.
- Sepolia is a public testnet, not a production election environment.
- Production use requires independent contract review, privacy review, operational controls, and election governance.

Read the full security material in:

- [`docs/security-model.md`](docs/security-model.md)
- [`docs/threat-model.md`](docs/threat-model.md)
- [`docs/limitations.md`](docs/limitations.md)
- [`docs/audit-checklist.md`](docs/audit-checklist.md)
- [`docs/backend-authenticity.md`](docs/backend-authenticity.md)

## Repository structure

```text
contracts/          Solidity source
frontend/           React + TypeScript application
scripts/            Compile, deploy, and local demo scripts
test/               Contract and frontend tests
docs/               Architecture, security, deployment, and user guides
DESIGN.md           Visual design system
UX-CONTRACT.md      Interaction and state contract
```

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system boundaries and data flow.
- [`docs/commit-reveal-flow.md`](docs/commit-reveal-flow.md) — commitment, reveal, and finalization behavior.
- [`docs/deployment.md`](docs/deployment.md) — local and Sepolia deployment notes.
- [`docs/testing.md`](docs/testing.md) — test strategy and verification commands.
- [`docs/user-guide.md`](docs/user-guide.md) — voter and administrator workflows.
- [`docs/limitations.md`](docs/limitations.md) — explicit product limitations.
- [`DESIGN.md`](DESIGN.md) — Bitcoin-inspired orange, amber, graphite, and paper design system.
- [`UX-CONTRACT.md`](UX-CONTRACT.md) — protected-route and transaction-state behavior.
- [`SecureVote_Video_Presentation_Script.md`](SecureVote_Video_Presentation_Script.md) — concise technical presentation narration.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request. Contributions that change contract behavior should include tests and an update to the relevant security or architecture documentation.

## License

This project is released under the MIT License. See [`LICENSE`](LICENSE).

