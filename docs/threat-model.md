# Threat model

| Threat                    | Mitigation                                                                |
| ------------------------- | ------------------------------------------------------------------------- |
| Double voting             | One commitment and one reveal per wallet/election                         |
| Unauthorized voting       | Owner-controlled eligibility registry                                     |
| Replay across elections   | Commitment includes election ID and voter address                         |
| Wrong-wallet reveal       | Commitment includes the original address and reveal checks `msg.sender`   |
| Secret leakage            | Secret is generated locally and absent from events/logs                   |
| Lost secret               | Clear receipt export and recovery warning; the contract cannot recover it |
| Admin result manipulation | Results are incremented by reveals and are immutable after finalization   |
| Provider failure          | UI displays an honest unavailable state instead of cached fake data       |
| Public privacy leakage    | Document that wallets and reveal transactions are public                  |
