# Security model

## Protected properties

- One commitment per eligible voter per election.
- One reveal per commitment.
- A reveal must come from the committing wallet.
- A candidate choice cannot be changed after commitment.
- Finalized counts cannot be edited.
- Results are unavailable through the contract getter until finalization.

## Explicit limitations

Reveal transactions are public. The protocol delays disclosure during the commit period but does not provide permanent anonymity or coercion resistance. Voter registration is controlled by the contract owner. Secrets are not recoverable after loss.

## Implementation controls

The contract uses OpenZeppelin two-step ownership, custom errors, checked arithmetic, strict phase validation, replay-resistant commitments, no payable functions, no `tx.origin`, no unsafe assembly, no hidden result-editing path, and bounded voter batches.
