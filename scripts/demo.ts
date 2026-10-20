import { ethers } from "hardhat";

async function main() {
  const [owner, voterOne, voterTwo] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("SecureVote");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const now = Math.floor(Date.now() / 1000);
  const start = now + 30;
  const commitEnd = now + 180;
  const revealEnd = now + 360;
  const tx = await contract.createElection(
    "Student Union Representative 2026",
    "A demonstration campus election for the SecureVote local network.",
    ["Asha Mehta", "Rohan Iyer", "Maya Fernandes", "Dev Patel"],
    [
      "Build a more open student union.",
      "Make campus events accessible.",
      "Put student wellbeing first.",
      "Modernize club funding.",
    ],
    start,
    commitEnd,
    revealEnd,
  );
  await tx.wait();
  await (
    await contract.registerVoters(1, [voterOne.address, voterTwo.address])
  ).wait();

  console.log(
    JSON.stringify(
      {
        contract: await contract.getAddress(),
        electionId: 1,
        owner: owner.address,
        voters: [voterOne.address, voterTwo.address],
        schedule: { start, commitEnd, revealEnd },
      },
      null,
      2,
    ),
  );
  console.log(
    "The demo uses real local-chain transactions. Advance time before committing/revealing as needed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
