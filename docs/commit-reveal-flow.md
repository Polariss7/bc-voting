# Commit-reveal flow

1. The voter selects a candidate locally.
2. The browser generates a 32-byte secret using `crypto.getRandomValues()`.
3. The browser hashes election ID, wallet address, candidate ID, and secret.
4. The contract records only the hash during the commit window.
5. During the reveal window, the voter submits the candidate ID and secret.
6. The contract recomputes and verifies the hash.
7. After the reveal deadline, anyone can finalize the election.
8. Finalized counts become readable through the results getter.
