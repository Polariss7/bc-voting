import { describe, it, expect, vi } from "vitest";
vi.mock("../config/env", () => ({
  appConfig: {
    chainId: 11155111,
    contractAddress: "0x1111111111111111111111111111111111111111",
  },
}));
import {
  commitmentFor,
  parseReceipt,
  loadReceipt,
  saveReceipt,
} from "./receipts";
const wallet = "0x2222222222222222222222222222222222222222";
const secret = `0x${"ab".repeat(32)}`;
const receipt = {
  version: 2,
  chainId: 11155111,
  contractAddress: "0x1111111111111111111111111111111111111111",
  electionId: "1",
  walletAddress: wallet,
  candidateId: "0",
  secret,
  commitment: commitmentFor("1", wallet, "0", secret),
  createdAt: "2026-10-20T00:00:00Z",
};
describe("ballot recovery", () => {
  it("accepts candidate zero and a valid downloaded receipt", () => {
    expect(receipt.commitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(parseReceipt(JSON.stringify(receipt), "1", wallet)).toEqual(receipt);
  });
  it("does not crash while a reveal secret is being typed", () => {
    for (const value of [
      "",
      "0",
      "0x",
      "0xab",
      "not a secret",
      `0x${"ab".repeat(33)}`,
    ])
      expect(commitmentFor("1", wallet, "0", value)).toBe("");
  });
  it("rejects wrong wallet, election, deployment, network and tampered contents", () => {
    for (const changes of [
      { walletAddress: receipt.contractAddress },
      { electionId: "2" },
      { chainId: 31337 },
      { contractAddress: wallet },
      { candidateId: "1" },
      { secret: "0x" },
      { commitment: "" },
    ])
      expect(() =>
        parseReceipt(JSON.stringify({ ...receipt, ...changes }), "1", wallet),
      ).toThrow();
  });
  it("handles malformed JSON and storage failures", () => {
    expect(() => parseReceipt("null", "1", wallet)).toThrow();
    expect(() => parseReceipt("{", "1", wallet)).toThrow();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadReceipt("1", wallet)).toBeNull();
    vi.unstubAllGlobals();
  });
  it("namespaces recovery by deployment, network, election and wallet", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });
    saveReceipt(receipt);
    expect(setItem.mock.calls[0][0]).toBe(
      `securevote:receipt:v2:11155111:${receipt.contractAddress}:1:${wallet}`,
    );
    vi.unstubAllGlobals();
  });
});
