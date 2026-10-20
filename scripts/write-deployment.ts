import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function writeDeployment(
  name: string,
  address: string,
  chainId: number,
  deploymentBlock: number,
) {
  const output = resolve("frontend/src/config/deployments");
  await mkdir(output, { recursive: true });
  await writeFile(
    resolve(output, `${name}.json`),
    JSON.stringify({ address, chainId, deploymentBlock }, null, 2),
  );
  const rpc = chainId === 31337 ? "http://127.0.0.1:8545" : "";
  const explorer = chainId === 11155111 ? "https://sepolia.etherscan.io" : "";
  const config = `VITE_CONTRACT_ADDRESS=${address}\nVITE_CHAIN_ID=${chainId}\nVITE_DEPLOYMENT_BLOCK=${deploymentBlock}\nVITE_RPC_URL=${rpc}\nVITE_BLOCK_EXPLORER_URL=${explorer}\n`;
  await writeFile(resolve(".env.local"), config);
  console.log(
    `Frontend configured in .env.local. Restart npm run dev or rebuild the frontend.`,
  );
  console.log(
    `For hosting, copy these PUBLIC values into the hosting environment, then rebuild:\n${config}`,
  );
}
