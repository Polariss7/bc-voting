export type Election = {
  id: bigint;
  title: string;
  description: string;
  commitStart: bigint;
  commitEnd: bigint;
  revealEnd: bigint;
  finalized: boolean;
  candidateCount: bigint;
  totalCommitted: bigint;
  totalRevealed: bigint;
};

export type Candidate = { id: bigint; name: string; manifesto: string };
export type VoterStatus = {
  eligible: boolean;
  committed: boolean;
  revealed: boolean;
  commitment: string;
};
export type Result = { id: bigint; name: string; votes: bigint };

export function toElection(value: any): Election {
  return {
    id: BigInt(value.id),
    title: value.title,
    description: value.description,
    commitStart: BigInt(value.commitStart),
    commitEnd: BigInt(value.commitEnd),
    revealEnd: BigInt(value.revealEnd),
    finalized: value.finalized,
    candidateCount: BigInt(value.candidateCount),
    totalCommitted: BigInt(value.totalCommitted),
    totalRevealed: BigInt(value.totalRevealed),
  };
}

export function toCandidates(values: any[]): Candidate[] {
  return values.map((value) => ({
    id: BigInt(value.id),
    name: value.name,
    manifesto: value.manifesto,
  }));
}

export function phaseOf(
  election: Election,
  now = Math.floor(Date.now() / 1000),
) {
  if (election.finalized) return "finalized" as const;
  if (now < Number(election.commitStart)) return "scheduled" as const;
  if (now < Number(election.commitEnd)) return "commit" as const;
  if (now < Number(election.revealEnd)) return "reveal" as const;
  return "ready" as const;
}

export function shortAddress(address?: string) {
  return address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Not connected";
}

export function formatTime(timestamp: bigint) {
  return new Date(Number(timestamp) * 1000).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
