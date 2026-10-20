# SecureVote design context

SecureVote is a campus election registry, not a speculative trading dashboard. Its visual language combines a block explorer's precision with the familiar yellow-orange energy of Bitcoin and the restraint of an institutional record room.

## Tokens

- Bitcoin Orange `#F7931A`: primary actions and active states.
- Deep Orange `#C85A0A`: action text and selected-state emphasis.
- Amber `#FFB84D`: verification and attention.
- Graphite `#191714`: navigation, technical detail, strong contrast.
- Paper `#F7F3EA`: main reading surface.
- Warm Gray `#D8D0C4`: rules, disabled controls, chart tracks.
- Muted Ink `#71695F`: secondary copy.

Headings use Barlow Semi Condensed, body copy uses IBM Plex Sans, and addresses/hashes use IBM Plex Mono. The confirmation rail—Commit → Reveal → Finalized—is the recurring signature element. Guided mode extends it into a six-checkpoint walkthrough with a left-side numbered route and live wallet status, so the tutorial feels like a protocol inspection rather than a marketing carousel.

## Product behavior

The contract is the source of truth. The UI never manufactures election or result data. When configuration or an RPC provider is unavailable, the interface shows a setup state. Orange is reserved for action and progress; it is never used as a universal success color.

The guided mode is public, but it never pretends to be live data. It explains contract reads and signed writes, exposes the actual MetaMask/network state, and links to protected routes only after the real wallet checkpoint is satisfied.

## Anti-patterns

No purple gradients, glassmorphism, 3D coins, fake activity feeds, fake metrics, decorative crypto imagery, or one-card-per-section dashboard repetition. Empty, loading, and error states are part of the product language.
