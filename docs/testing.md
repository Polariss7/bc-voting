# Testing

Contract tests cover schedule validation, access control, registration, commitment binding, wrong-wallet and invalid-secret reveals, duplicate actions, finalization, replay protection, multiple elections, and non-revealed voters.

Frontend verification covers missing configuration, MetaMask connection and wrong network states, route bypass attempts, account-specific access, real transaction receipts, provider failure, receipt mismatch, finalized-result loading, and public guided mode. Guided mode tests also assert that it renders without MetaMask and does not contain fabricated election records.

The strict UI audit is run with:

```bash
python3 /Users/nikhiljogesh/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py . --mode strict
```

Backend authenticity is documented in `docs/backend-authenticity.md`; runtime verification must use a deployed contract, confirmed receipts, and explorer-linked event data.
