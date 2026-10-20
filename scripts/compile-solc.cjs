const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");

const sourceName = "contracts/SecureVote.sol";
const source = fs.readFileSync(path.resolve(sourceName), "utf8");

function findImports(importPath) {
  const candidate = path.resolve("node_modules", importPath);
  if (!fs.existsSync(candidate))
    return { error: `File not found: ${importPath}` };
  return { contents: fs.readFileSync(candidate, "utf8") };
}

const input = {
  language: "Solidity",
  sources: { [sourceName]: { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"] },
    },
  },
};

const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports }),
);
const errors = (output.errors || []).filter(
  (item) => item.severity === "error",
);
if (errors.length) {
  console.error(errors.map((item) => item.formattedMessage).join("\n"));
  process.exit(1);
}

const compiled = output.contracts[sourceName].SecureVote;
const artifact = {
  _format: "hh-sol-artifact-1",
  contractName: "SecureVote",
  sourceName,
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
  deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`,
  linkReferences: compiled.evm.bytecode.linkReferences,
  deployedLinkReferences: compiled.evm.deployedBytecode.linkReferences,
};

const destination = path.resolve(
  "artifacts/contracts/SecureVote.sol/SecureVote.json",
);
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(artifact, null, 2));
console.log(
  `Compiled SecureVote with solc ${solc.version()} -> ${destination}`,
);
