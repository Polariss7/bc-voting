import { isAddress, ZeroAddress } from "ethers";

export const appConfig = {
  deploymentBlock: Math.max(0, Number(import.meta.env.VITE_DEPLOYMENT_BLOCK || 0)),
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined,
  chainId: Number(import.meta.env.VITE_CHAIN_ID || 0),
  rpcUrl: (import.meta.env.VITE_RPC_URL as string | undefined) || "",
  explorerUrl:
    (import.meta.env.VITE_BLOCK_EXPLORER_URL as string | undefined) || "",
};

// Protected routes read through the connected MetaMask BrowserProvider. An RPC URL
// may still be useful for deployment tooling, but it cannot unlock the application.
export const isConfigured = Boolean(
  appConfig.contractAddress && isAddress(appConfig.contractAddress) && appConfig.contractAddress !== ZeroAddress && Number.isSafeInteger(appConfig.chainId) && appConfig.chainId > 0,
);

