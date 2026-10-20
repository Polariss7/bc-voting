import { BrowserProvider, Contract } from "ethers";
import { secureVoteAbi } from "../config/abi";
import { appConfig } from "../config/env";

export type InjectedEthereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

export function getInjected(): InjectedEthereum | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: InjectedEthereum }).ethereum;
}

export function getContract(providerOrSigner: BrowserProvider) {
  if (!appConfig.contractAddress) return null;
  return new Contract(
    appConfig.contractAddress,
    secureVoteAbi,
    providerOrSigner,
  );
}

export async function getWriteContract(provider: BrowserProvider) {
  if (!appConfig.contractAddress) return null;
  const signer = await provider.getSigner();
  return new Contract(appConfig.contractAddress, secureVoteAbi, signer);
}

export function formatError(error: unknown) {
  const value = error as {
    shortMessage?: string;
    reason?: string;
    message?: string;
  };
  return (
    value.shortMessage ||
    value.reason ||
    value.message ||
    "The blockchain request failed."
  );
}
