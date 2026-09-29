import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const accounts = PRIVATE_KEY ? [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    monadTestnet: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts,
    },
  },
};

export default config;

// Optional: compile with the npm `solc` package (set USE_SOLCJS=1) when binaries.soliditylang.org is unreachable.
if (process.env.USE_SOLCJS === "1") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { subtask } = require("hardhat/config");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");
  subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args: { solcVersion: string }, _hre: unknown, runSuper: Function) => {
    if (args.solcVersion === "0.8.24") {
      const compilerPath = require.resolve("solc/soljson.js");
      return { compilerPath, isSolcJs: true, version: "0.8.24", longVersion: "0.8.24+commit.e11b9ed9" };
    }
    return runSuper();
  });
}
