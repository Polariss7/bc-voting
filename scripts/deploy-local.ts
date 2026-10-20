import { ethers } from "hardhat";
import { writeDeployment } from "./write-deployment";

async function main() {
  const factory = await ethers.getContractFactory("SecureVote");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const receipt = await contract.deploymentTransaction()!.wait();
  await writeDeployment("localhost", address, 31337, receipt!.blockNumber);
  console.log(`SecureVote deployed to ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

