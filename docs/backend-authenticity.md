# Backend authenticity

SecureVote has no centralized application database in version one. `SecureVote.sol` is the backend and the deployed contract is the source of truth.

## Runtime data paths

| Concern                          | Runtime source                                                                                            | What is not used                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Election list and metadata       | `getElectionCount()`, `getElection()`, `getCandidates()` through the connected MetaMask `BrowserProvider` | hard-coded election arrays, static JSON, mock records   |
| Eligibility and voter status     | `getVoterStatus()` for the connected address                                                              | local eligibility flags, hard-coded student identities  |
| Commit, reveal, and finalization | MetaMask-signed contract transactions followed by `wait()` receipts                                       | fabricated transaction hashes, optimistic final tallies |
| Results                          | `getElectionResults()` only after contract finalization                                                   | client-side vote totals, pre-finalization charts        |
| Audit history                    | Contract event filters with block numbers and transaction hashes                                          | fake activity feeds or synthetic audit events           |
| Reveal recovery                  | Optional local receipt containing the voter secret                                                        | local storage as an election database                   |

## Honest failure behavior

Protected routes require MetaMask and the configured chain before contract components mount. A missing address, wrong chain, unavailable provider, reverted transaction, or empty contract returns an explicit state. The UI does not fall back to a read-only provider or demo data.

## Verification checklist

1. Refresh the app and confirm the election list is reconstructed from contract calls.
2. Change the configured contract address and confirm the displayed registry changes or shows a read error.
3. Submit a transaction from a second wallet and confirm its receipt/event appears after refresh.
4. Stop the provider and confirm the app shows an unavailable/error state.
5. Inspect transaction hashes and blocks in the configured network explorer.
6. Confirm results remain unavailable until `finalizeElection()` is confirmed on-chain.

The local `scripts/demo.ts` is a development utility that sends real transactions to a local Hardhat chain. It is not imported by the frontend and cannot supply production runtime state.
