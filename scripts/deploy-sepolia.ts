import { ethers } from "hardhat";
import { writeDeployment } from "./write-deployment";

async function main() {
  if (!process.env.SEPOLIA_RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY are required.");
  }
  const factory = await ethers.getContractFactory("SecureVote");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const receipt = await contract.deploymentTransaction()!.wait();
  await writeDeployment("sepolia", address, 11155111, receipt!.blockNumber);
  console.log(`SecureVote deployed to Sepolia at ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
