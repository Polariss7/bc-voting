import { describe, expect, it } from "vitest";
import { phaseOf, shortAddress, toElection } from "./types";

const election = toElection({
  id: 1n,
  title: "Test",
  description: "Test election",
  commitStart: 100n,
  commitEnd: 200n,
  revealEnd: 300n,
  finalized: false,
  candidateCount: 2n,
  totalCommitted: 0n,
  totalRevealed: 0n,
});

describe("election display helpers", () => {
  it("maps the protocol phase from chain timestamps", () => {
    expect(phaseOf(election, 50)).toBe("scheduled");
    expect(phaseOf(election, 150)).toBe("commit");
    expect(phaseOf(election, 250)).toBe("reveal");
    expect(phaseOf(election, 350)).toBe("ready");
    expect(phaseOf({ ...election, finalized: true }, 150)).toBe("finalized");
  });

  it("shortens wallet addresses without inventing identity", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234…5678",
    );
    expect(shortAddress()).toBe("Not connected");
  });
});
