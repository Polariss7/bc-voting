# Deployment

## Local

Run `npx hardhat node` in one terminal and `npm run deploy:local` in another. Set the generated contract address, chain ID `31337`, and RPC URL in `.env.local`.

## Sepolia

Set `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and `ETHERSCAN_API_KEY`, then run `npm run deploy:sepolia`. Fund the deployer with Sepolia ETH. Copy the actual output address into `VITE_CONTRACT_ADDRESS`.

Never commit deployment keys or claim a deployment exists unless the transaction was actually confirmed.
