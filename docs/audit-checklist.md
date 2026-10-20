# Audit checklist

- [x] Commitments bind election, wallet, candidate, and secret.
- [x] Secrets are not stored on-chain.
- [x] Secrets are not emitted in events.
- [x] Double commitment and double reveal are blocked.
- [x] Wrong-wallet reveals are blocked.
- [x] Results are unavailable before finalization.
- [x] Finalization is permissionless after the reveal deadline.
- [x] No production fake data path exists.
- [ ] Formal third-party security audit.
- [ ] Institutional multisig for production owner.
