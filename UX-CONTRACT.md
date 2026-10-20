# SecureVote UX contract

## Source of truth

Election configuration, eligibility, commitments, reveals, finalization, results, events, block numbers, and transaction hashes come from the deployed SecureVote contract through Ethers.js. Local storage is used only for an optional voter receipt.

## Navigation

- Landing: explain the protocol and limitations.
- Guided mode: public, state-aware walkthrough of the real wallet, contract, commit-reveal, audit, and owner flows.
- Elections: connect MetaMask on the configured chain, then browse contract-backed election records.
- Election detail: connect MetaMask before inspecting phases, voting, revealing, or reading finalized results.
- Public audit: connect MetaMask to enter the audit view; the underlying public chain remains independently inspectable.
- Admin: connect MetaMask on the configured chain, then create elections and register wallets when `owner()` verifies access.

## Wallet checkpoint

All routes except the landing page pass through `RequireMetaMask`. The checkpoint has explicit states for MetaMask unavailable, disconnected, pending approval, rejected connection, wrong network, missing configuration, and connected access. It checks `window.ethereum.isMetaMask`, requires `eth_requestAccounts`, and requires the connected wallet chain to equal `VITE_CHAIN_ID` before protected route components mount.

Account changes and disconnects immediately clear the provider and account-specific state. Network changes reload the app into the checkpoint. No local-storage flag, URL parameter, hard-coded address, demo mode, or read-only provider can bypass the gate.

## State behavior

- Loading: show a stable chain-reading state.
- Empty: explain that no on-chain records exist and never substitute demo data.
- Error: state what provider, configuration, or transaction failed and offer recovery.
- Success: show the actual transaction hash and re-read contract state.
- Results: unavailable before finalization and visible after a confirmed finalization.

## Guided mode

`/guide` is intentionally public so a first-time voter can understand SecureVote before connecting. It uses local tutorial state only for the active step; it never stores or fabricates election records. The wallet panel reads the current MetaMask detection, connection, account, and chain state. Links to Elections, Public audit, and Admin still pass through the same protected route guard.

## Privacy language

Commit-reveal provides delayed disclosure during the commit period. Reveal transactions are public. Wallet addresses are public. A lost secret cannot be recovered, and non-revealed commitments are excluded.

## Canonical UI Map

| Capability     | Canonical owner                                                    | Source of truth                                        | Allowed variants                               | Verification                                      |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------- |
| Select/Listbox | Native `<select>` in the voter reveal flow                         | Browser form value mapped to the contract candidate ID | Native select only; no parallel custom listbox | Frontend typecheck and browser QA                 |
| Form           | Native labels and controlled React inputs in Admin and voter flows | Contract transaction arguments after validation        | Business-named screen sections                 | Frontend tests, lint, and real transaction review |
| Scrollbar      | Global document scrollbar tokens in `frontend/src/styles.css`      | Paper/graphite design tokens                           | No hidden scrollbars                           | CSS review and responsive browser QA              |
