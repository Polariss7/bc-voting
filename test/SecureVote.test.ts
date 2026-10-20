import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("SecureVote", function () {
  let vote: any;
  let owner: Signer;
  let voter: Signer;
  let other: Signer;

  async function schedule() {
    const block = await ethers.provider.getBlock("latest");
    const now = block!.timestamp;
    return { start: now + 10, commitEnd: now + 100, revealEnd: now + 200 };
  }

  async function create() {
    const times = await schedule();
    await vote.createElection(
      "Class Representative",
      "A test election.",
      ["Ada", "Linus"],
      ["Open office hours.", "Publish the budget."],
      times.start,
      times.commitEnd,
      times.revealEnd,
    );
    await vote.registerVoter(1, await voter.getAddress());
    return times;
  }

  async function setTime(timestamp: number) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    await ethers.provider.send("evm_mine");
  }

  beforeEach(async () => {
    [owner, voter, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("SecureVote");
    vote = await factory.deploy();
    await vote.waitForDeployment();
  });

  it("creates elections and registers voters", async () => {
    const times = await create();
    expect(await vote.getElectionCount()).to.equal(1);
    expect(await vote.isEligible(1, await voter.getAddress())).to.equal(true);
    expect((await vote.getElection(1)).commitStart).to.equal(times.start);
  });

  it("rejects malformed schedules and empty candidates", async () => {
    const times = await schedule();
    await expect(
      vote.createElection(
        "x",
        "x",
        [],
        [],
        times.start,
        times.commitEnd,
        times.revealEnd,
      ),
    ).to.be.revertedWithCustomError(vote, "EmptyCandidates");
    await expect(
      vote.createElection(
        "x",
        "x",
        ["x"],
        [],
        times.start,
        times.commitEnd,
        times.revealEnd,
      ),
    ).to.be.revertedWithCustomError(vote, "CandidateInputMismatch");
    await expect(
      vote.createElection(
        "x",
        "x",
        ["x"],
        ["x"],
        times.commitEnd,
        times.start,
        times.revealEnd,
      ),
    ).to.be.revertedWithCustomError(vote, "InvalidSchedule");
  });

  it("prevents unauthorized registration and duplicate registration", async () => {
    const times = await schedule();
    await vote.createElection(
      "x",
      "x",
      ["x"],
      ["x"],
      times.start,
      times.commitEnd,
      times.revealEnd,
    );
    await expect(
      vote.connect(other).registerVoter(1, await other.getAddress()),
    ).to.be.revertedWithCustomError(vote, "OwnableUnauthorizedAccount");
    await vote.registerVoter(1, await voter.getAddress());
    await expect(
      vote.registerVoter(1, await voter.getAddress()),
    ).to.be.revertedWithCustomError(vote, "AlreadyRegistered");
  });

  it("commits and reveals only with a matching secret", async () => {
    const times = await create();
    const secret = ethers.id("private-test-secret");
    const commitment = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "uint256", "bytes32"],
        [1, await voter.getAddress(), 0, secret],
      ),
    );
    await setTime(times.start);
    await expect(vote.connect(voter).commitVote(1, commitment)).to.emit(
      vote,
      "VoteCommitted",
    );
    await setTime(times.commitEnd);
    await expect(
      vote.connect(voter).revealVote(1, 1, secret),
    ).to.be.revertedWithCustomError(vote, "CommitmentMismatch");
    await expect(vote.connect(voter).revealVote(1, 0, secret)).to.emit(
      vote,
      "VoteRevealed",
    );
    await expect(
      vote.connect(voter).revealVote(1, 0, secret),
    ).to.be.revertedWithCustomError(vote, "AlreadyRevealed");
  });

  it("prevents a wrong wallet from revealing", async () => {
    const times = await create();
    const secret = ethers.id("secret");
    const commitment = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "uint256", "bytes32"],
        [1, await voter.getAddress(), 0, secret],
      ),
    );
    await setTime(times.start);
    await vote.connect(voter).commitVote(1, commitment);
    await setTime(times.commitEnd);
    await expect(
      vote.connect(other).revealVote(1, 0, secret),
    ).to.be.revertedWithCustomError(vote, "NotEligible");
  });

  it("hides results until finalization and excludes non-reveals", async () => {
    const times = await create();
    const secret = ethers.id("secret");
    const commitment = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "uint256", "bytes32"],
        [1, await voter.getAddress(), 0, secret],
      ),
    );
    await setTime(times.start);
    await vote.connect(voter).commitVote(1, commitment);
    await setTime(times.commitEnd);
    await expect(vote.getElectionResults(1)).to.be.revertedWithCustomError(
      vote,
      "NotReadyToFinalize",
    );
    await vote.connect(voter).revealVote(1, 0, secret);
    await setTime(times.revealEnd);
    await vote.connect(other).finalizeElection(1);
    const result = await vote.getElectionResults(1);
    expect(result[2][0]).to.equal(1);
    expect(result[5]).to.equal(0);
  });

  it("allows anyone to finalize after reveal closes", async () => {
    const times = await create();
    await setTime(times.revealEnd);
    await expect(vote.connect(other).finalizeElection(1)).to.emit(
      vote,
      "ElectionFinalized",
    );
  });
  it("counts independent wallets exactly once and excludes missing reveals", async () => {
    const times = await create();
    const [, , second, third] = await ethers.getSigners();
    await vote.registerVoters(1, [await second.getAddress(), await third.getAddress()]);
    const people = [voter, second, third];
    const secrets = people.map((_, i) => ethers.id(`test-only-${i}`));
    const choices = [0, 1, 0];
    await setTime(times.start);
    for (let i = 0; i < people.length; i++) {
      const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "uint256", "bytes32"],
        [1, await people[i].getAddress(), choices[i], secrets[i]],
      ));
      await vote.connect(people[i]).commitVote(1, commitment);
      await expect(vote.connect(people[i]).commitVote(1, commitment))
        .to.be.revertedWithCustomError(vote, "AlreadyCommitted");
    }
    await expect(vote.connect(owner).commitVote(1, ethers.id("ineligible")))
      .to.be.revertedWithCustomError(vote, "NotEligible");
    await expect(vote.finalizeElection(1)).to.be.revertedWithCustomError(vote, "NotReadyToFinalize");
    await setTime(times.commitEnd);
    await vote.connect(voter).revealVote(1, 0, secrets[0]);
    await vote.connect(second).revealVote(1, 1, secrets[1]);
    await setTime(times.revealEnd);
    await expect(vote.connect(third).revealVote(1, 0, secrets[2]))
      .to.be.revertedWithCustomError(vote, "NotRevealPhase");
    await vote.connect(owner).finalizeElection(1);
    const result = await vote.getElectionResults(1);
    expect([...result[2]]).to.deep.equal([1n, 1n]);
    expect(result[3]).to.equal(3);
    expect(result[4]).to.equal(2);
    expect(result[5]).to.equal(1);
    await expect(vote.finalizeElection(1)).to.be.revertedWithCustomError(vote, "ElectionAlreadyFinalized");
  });

  it("closes registration at commit start and commits at reveal start", async () => {
    const times = await create();
    await setTime(times.start);
    await expect(vote.registerVoter(1, await other.getAddress()))
      .to.be.revertedWithCustomError(vote, "ElectionAlreadyStarted");
    await setTime(times.commitEnd);
    await expect(vote.connect(voter).commitVote(1, ethers.id("late")))
      .to.be.revertedWithCustomError(vote, "NotCommitPhase");
  });

});

