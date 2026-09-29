import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  const arbiter = process.env.ARBITER_ADDRESS || deployer.address;
  console.log("Deployer:", deployer.address);
  console.log("Arbiter :", arbiter);

  const factory = await ethers.getContractFactory("StudentEscrow");
  const escrow = await factory.deploy(arbiter);
  await escrow.waitForDeployment();
  const addr = await escrow.getAddress();
  console.log("\n✅ StudentEscrow deployed at:", addr);
  console.log("\nAdd this to .env:\nNEXT_PUBLIC_CONTRACT_ADDRESS=" + addr);

  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync("deployments/latest.json", JSON.stringify({ address: addr, arbiter }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
