# Contributing to SecureVote

## Before you start

SecureVote is an educational and capstone-quality MVP for campus elections. It is not approved for production elections. Changes to the Solidity contract can affect voting integrity, privacy, and deployment security, so treat contract changes as security-sensitive.

## Development workflow

1. Fork the repository and create a focused branch.
2. Install dependencies with `npm install`.
3. Run the local verification suite before making changes:

   ```bash
   npm test
   npm run typecheck
   npm run lint
   npm run format:check
   npm run security:check
   npm run build
   ```

4. Make the smallest change that addresses the issue.
5. Add or update tests for behavioral changes.
6. Update the relevant documentation, especially for contract or wallet-flow changes.
7. Run the verification suite again and describe the results in the pull request.

## Smart-contract changes

Contract pull requests should explain:

- Which invariant or lifecycle rule changed.
- Whether storage layout or event signatures changed.
- How unauthorized calls, replay, phase boundaries, invalid candidates, and duplicate actions are tested.
- Whether the change affects voter privacy or the administrator trust boundary.

Never commit private keys, RPC credentials, wallet secrets, voter secrets, local environment files, or generated deployment addresses as application defaults.

## Pull requests

Keep pull requests focused. Include a concise problem statement, implementation summary, tests run, security considerations, and known limitations. Do not claim a contract is audited unless an independent audit has actually been completed and linked.
