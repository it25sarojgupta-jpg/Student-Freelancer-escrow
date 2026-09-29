import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("StudentEscrowModule", (m) => {
  const arbiter = m.getParameter("arbiter", m.getAccount(0));
  const escrow = m.contract("StudentEscrow", [arbiter]);
  return { escrow };
});
