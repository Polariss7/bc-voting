# Security Policy

## Scope

SecureVote is an educational blockchain voting prototype. It is not a production election platform, and the repository does not claim a formal smart-contract audit.

## Reporting a vulnerability

Please do not disclose an unpatched vulnerability in a public issue. Contact the repository owner privately through the GitHub profile associated with this repository and include:

- A clear description of the affected component.
- Reproduction steps or a minimal proof of concept.
- The potential impact.
- Any suggested mitigation.

Do not include private keys, wallet secrets, voter secrets, RPC credentials, or personally identifying voter data in a report.

## Security boundaries

- The contract is the source of truth for election state.
- Voter registration is administrator-controlled.
- MetaMask connection is an access requirement, not proof of eligibility.
- Commit–reveal provides delayed disclosure, not permanent anonymity.
- Reveal transactions and wallet addresses are public.
- Lost reveal secrets cannot be recovered.
- Sepolia and Hardhat are demonstration environments.

For implementation details, see [`docs/security-model.md`](docs/security-model.md) and [`docs/threat-model.md`](docs/threat-model.md).
