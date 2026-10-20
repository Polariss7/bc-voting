# SecureVote user guide

## Before entering the app

The landing page is public so anyone can inspect the protocol explanation and limitations. MetaMask is required for every other route, including Elections, election details, Public audit, and Admin.

Choose **Guided mode** from the navigation for a six-step walkthrough. It is public, but its wallet panel is live: it reports the actual MetaMask and network state, and its application links still enforce the real route checkpoint.

1. Install or enable the official MetaMask browser extension.
2. Open SecureVote and choose **Connect MetaMask**.
3. Approve the account request in MetaMask.
4. Switch MetaMask to the configured chain shown by the wallet checkpoint.

The app does not accept another injected wallet, a local-storage connection flag, a URL parameter, or a read-only RPC connection as a substitute.

## Voting

After the wallet checkpoint, open an election and confirm that the connected wallet is eligible. Choose a candidate, generate a receipt, and submit the commitment transaction. Save the JSON receipt and secret before leaving the page; the contract cannot recover a lost secret.

When the reveal phase opens, load the receipt or enter the candidate and secret manually. SecureVote recomputes the commitment locally and enables the reveal transaction only when it matches the on-chain commitment.

Reveal transactions are public. Commit-reveal provides temporary secrecy during the commit period, not permanent anonymity.

## Public audit

The Public audit route also requires MetaMask as an application access checkpoint. It uses the connected wallet's provider for reads, while the same election contract, events, block numbers, and transaction hashes remain independently inspectable on the public chain.

## Administrator

The Admin route first checks the connected address against `owner()` on the contract. It does not use a hard-coded administrator wallet or local password. The owner can create elections and register voter addresses; registration is a trust boundary and should be governed by institutional policy or a multisig in production.

## Troubleshooting

- **MetaMask unavailable:** install or enable MetaMask, then retry.
- **Connection rejected:** retry the request and approve the account prompt.
- **Wrong network:** use the wallet checkpoint's switch action or add the configured chain manually.
- **No elections:** the app is reading the configured contract and does not substitute demo data.
- **Lost receipt or secret:** the vote cannot be revealed; non-revealed commitments are excluded from the final tally.
