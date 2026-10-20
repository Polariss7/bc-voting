import { AbiCoder, isAddress, keccak256 } from "ethers";
import { appConfig } from "../config/env";

export type VoteReceipt = {
  version?: number;
  chainId?: number;
  contractAddress?: string;
  electionId: string;
  walletAddress: string;
  candidateId: string;
  secret: string;
  commitment: string;
  createdAt: string;
};

export function commitmentFor(
  electionId: string,
  wallet: string,
  candidate: string,
  secret: string,
): string {
  if (
    !/^\d+$/.test(electionId) ||
    !isAddress(wallet) ||
    !/^\d+$/.test(candidate) ||
    !/^0x[\da-fA-F]{64}$/.test(secret)
  )
    return "";
  try {
    return keccak256(
      AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "uint256", "bytes32"],
        [electionId, wallet, candidate, secret],
      ),
    );
  } catch {
    return "";
  }
}

export function parseReceipt(
  text: string,
  electionId: string,
  wallet: string,
): VoteReceipt {
  const value = JSON.parse(text) as VoteReceipt | null;
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.walletAddress !== "string" ||
    typeof value.electionId !== "string" ||
    typeof value.candidateId !== "string" ||
    typeof value.secret !== "string" ||
    typeof value.commitment !== "string" ||
    typeof value.createdAt !== "string"
  )
    throw new Error("Invalid receipt file.");
  if (
    value.electionId !== electionId ||
    value.walletAddress.toLowerCase() !== wallet.toLowerCase()
  ) {
    throw new Error("Receipt belongs to a different election or wallet.");
  }
  // Old receipts can be imported explicitly, but must also match the on-chain hash.
  if (
    (value.chainId !== undefined && value.chainId !== appConfig.chainId) ||
    (value.contractAddress !== undefined &&
      (typeof value.contractAddress !== "string" ||
        value.contractAddress.toLowerCase() !==
          appConfig.contractAddress?.toLowerCase()))
  ) {
    throw new Error("Receipt belongs to a different network or contract.");
  }
  const hash = commitmentFor(
    value.electionId,
    value.walletAddress,
    value.candidateId,
    value.secret,
  );
  if (!hash || hash.toLowerCase() !== value.commitment.toLowerCase())
    throw new Error("Receipt contents do not match its commitment.");
  return value;
}

const key = (electionId: string, wallet: string) =>
  `securevote:receipt:v2:${appConfig.chainId}:${appConfig.contractAddress?.toLowerCase()}:${electionId}:${wallet.toLowerCase()}`;

export function saveReceipt(receipt: VoteReceipt) {
  localStorage.setItem(
    key(receipt.electionId, receipt.walletAddress),
    JSON.stringify(receipt),
  );
}

export function loadReceipt(
  electionId: string,
  wallet: string,
): VoteReceipt | null {
  try {
    const value = localStorage.getItem(key(electionId, wallet));
    return value ? parseReceipt(value, electionId, wallet) : null;
  } catch {
    return null;
  }
}

export function downloadReceipt(receipt: VoteReceipt) {
  const blob = new Blob([JSON.stringify(receipt, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `securevote-receipt-${receipt.chainId ?? "legacy"}-${receipt.electionId}-${receipt.walletAddress.slice(0, 8)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
