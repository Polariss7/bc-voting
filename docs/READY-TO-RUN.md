# SecureVote: finish setup and run a shared election

## Status of this delivery

The existing Solidity protocol is retained. The updated frontend fixes receipt loss, partial-secret crashes, receipt import, stale phases, finalization access, zero-vote bars, and winner/tie display. Deployment scripts now write the frontend configuration automatically. Mac-only direct dependencies were made optional for Linux builds.

Verified in the editing environment: syntax parsing for all TypeScript/TSX sources, 21 receipt assertions using Ethers 6.17.0 (the lockfile version), and an application bundle with external dependencies excluded (checking local imports and exports). Full dependency installation, typechecking, the frontend build, Hardhat tests, browser voting, and Sepolia deployment could not be executed because npm network access was unavailable. This is a source update, not a certified or already-live deployment. Run the gates below before submission.

## 1. Install and check

Use Node.js 22 LTS. From the project root:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run security:check
npm run build
```

If formatting is requested by CI, run `npm run format`, review the diff, and rerun `npm run format:check`. Keep package-lock.json committed. Do not use `npm audit fix --force` as a shortcut.

## 2. Run locally first

Terminal 1:

```sh
npm run node
```

Terminal 2:

```sh
npm run deploy:local
npm run dev
```

Deployment writes `.env.local` with the actual address and chain. In MetaMask, add the local network: RPC `http://127.0.0.1:8545`, chain ID `31337`, symbol `ETH`. Use only Hardhat's test accounts for this local demo; these publicly known development keys must never hold real funds. Import the first Hardhat account to administer the contract. Localhost points to each person's own machine, so this setup is not the shared deployment for friends. A Hardhat reset clears the chain; redeploy, restart Vite, and use new receipts.

## 3. Deploy once to Sepolia for friends

The deployer becomes the administrator. Use a dedicated test wallet with Sepolia test ETH. Each voter also needs a small amount of test ETH for commit and reveal gas.

Copy `.env.example` to `.env`. Privately set `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` on your machine. Never send a seed phrase or private key in chat, commit it, add it to a `VITE_` variable, or upload it to frontend hosting.

```sh
npm run deploy:sepolia
npm run build
```

The deployment script prints the public address, chain ID, and deployment block, and writes `.env.local`. The frontend reads these variables; the JSON deployment record by itself is not sufficient.

## 4. Host the frontend

Deploy this project root as a Vite static site. Build command: `npm run build`. Output directory: `dist`. Set only these public build-time variables in hosting:

- `VITE_CONTRACT_ADDRESS`: deployed Sepolia address
- `VITE_CHAIN_ID`: `11155111`
- `VITE_DEPLOYMENT_BLOCK`: printed deployment block
- `VITE_BLOCK_EXPLORER_URL`: `https://sepolia.etherscan.io`

`vercel.json` includes SPA rewrites so shared `/elections/1` URLs survive refresh. Rebuild after changing variables. Do not upload `.env` or `.env.local`; do not set `DEPLOYER_PRIVATE_KEY` in frontend hosting. No backend server or database is required by this architecture.

## 5. Hold an election

1. Open the hosted URL in a MetaMask-enabled browser, select Sepolia, and connect the deployer wallet.
2. In Admin, add the title and candidates (`Name | manifesto`, one per line).
3. Choose deadlines. All three numbers are offsets from creation, not durations. Defaults 30/90/150 give 30 minutes to register, 60 minutes to commit, and 60 minutes to reveal.
4. Create the election and wait for confirmation. Its actual ID is selected in the registration form.
5. Collect friends' public wallet addresses and register them before the commit start. Register your own wallet if voting. Duplicate addresses in the input are removed; a wallet already registered on-chain should be omitted from a later batch.
6. Share the election URL. Everyone must connect the same wallet that was registered, on Sepolia.
7. During commit, each voter selects a candidate, generates and downloads the private receipt, acknowledges the backup, and confirms the commit transaction. A local recovery copy is optional and enabled by default. It contains the private secret; avoid shared browser profiles.
8. During reveal, voters return and load their saved receipt or import the downloaded JSON. The hash must match their on-chain commitment before Reveal is enabled. Confirm the reveal transaction.
9. After the reveal deadline, any connected wallet can open the election and select Finalize. This is a transaction; it is not automatic merely because the deadline passes.
10. After confirmation, the results show counts, winner or tie, and unrevealed ballots. Other browsers refresh state every 10 seconds. No revealed votes means no winner.

## Submission acceptance check

Use at least three registered wallets. Commit from all three; reveal from two; finalize using a fourth, unregistered wallet. Confirm exactly two counted votes and one unrevealed commitment. Repeat with two votes for the same candidate to show a winner. Verify refresh and another browser show the same chain state. Try an unregistered wallet, a second commit, a wrong secret, wrong network, and a missed reveal. Confirm they cannot add a vote. Test receipt import after a browser restart.

## Accuracy and limitations

This provides temporary secrecy during commit, not permanent anonymity. Anyone can reconstruct partial results from public reveal events during reveal; hiding the results getter does not prevent that. The admin controls eligibility, and one eligible wallet is not automatically proof of one unique student. Receipt loss prevents recovery. Recent activity shows only the last 2,000 blocks and may be unavailable under provider limits; the explorer contains the older chain record. The UI phase comes from the latest polled block, and the contract enforces exact deadlines.
