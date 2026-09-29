# 🎓 CampusEscrow — Student Freelance Escrow (Web3 SkillBuildZ · Singularity 2.0)

Trustless payments for student freelancers. A client locks funds in a smart contract; the student delivers; payment is released on approval — or **automatically** if the client ghosts. Disputes go to an arbiter. Built for **Monad Testnet**.

**Stack:** Solidity 0.8.24 · Hardhat v2 · Next.js 14 · Tailwind · Wagmi v2 · Viem

## The problem
Students doing freelance gigs get ghosted, underpaid, or pay platform fees of 10–20%. Clients fear paying upfront to strangers. Escrow on-chain fixes both sides with **no middleman and 0% fee**.

## How it works
| Step | Actor | Contract call | Result |
|---|---|---|---|
| 1 | Client | `createJob` (sends MON) | Funds locked |
| 2 | Student | `submitWork(link)` | Status → Submitted |
| 3a | Client | `approve` | Student paid instantly |
| 3b | Student | `claimAfterReview` | Paid automatically if client silent past the review window |
| 3c | Client | `refundAfterDeadline` | Refund if student never delivered |
| 3d | Student | `declineJob` | Refund if student backs out |
| 4 | Either | `raiseDispute` → Arbiter `resolveDispute(share)` | Funds split fairly |

Security: custom reentrancy guard, checks-effects-interactions, custom errors, role checks, status state-machine, 12 passing tests.

## Quick start
```bash
npm install
cp .env.example .env          # fill PRIVATE_KEY (throwaway testnet wallet)
npm test                      # 12 tests should pass

# get testnet MON from the Monad faucet for your deployer wallet, then:
npm run deploy:monad          # prints the contract address
# paste it into .env as NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

npm run dev                   # http://localhost:3000
```
MetaMask network: **Monad Testnet**, Chain ID `10143`, currency `MON`, RPC `https://testnet-rpc.monad.xyz`, explorer `https://testnet.monadexplorer.com`. The app has a one-click "Switch network" button.

### Local demo (no faucet needed)
```bash
npm run node                  # terminal 1 – local chain with funded accounts
npm run deploy:local          # terminal 2
# .env: NEXT_PUBLIC_CHAIN=local and NEXT_PUBLIC_CONTRACT_ADDRESS=<printed address>
npm run dev
```
Import two of the printed Hardhat private keys into MetaMask (client + student). The deployer (account #0) is the arbiter.

## Project structure
```
contracts/StudentEscrow.sol   main smart contract
test/StudentEscrow.ts         12 tests (happy path, ghosting, refund, disputes, access control)
scripts/deploy.ts             deploy + writes deployments/latest.json
ignition/modules/             Hardhat Ignition alternative
src/app, src/components       Next.js UI (create job, job cards, arbiter panel)
src/lib/abi.ts, wagmi.ts      ABI + Monad Testnet chain config
docs/                         pitch, demo script, submission checklist
```

## Troubleshooting
- **Solidity compiler download blocked (HH502)?** Run `USE_SOLCJS=1 npm test` (uses the bundled npm `solc`).
- **Do NOT upgrade to Hardhat v3.** Keep `hardhat@^2` and `@nomicfoundation/hardhat-toolbox@hh2`.
- **"Failed to fetch" RPC warnings:** testnet RPCs rate-limit; the app auto-falls back across 3 RPCs.
- After editing `.env`, restart `npm run dev`.

## Future scope
Milestone payments · ERC-20/USDC stablecoin payments · student reputation NFTs/soulbound badges · multi-arbiter DAO voting · on-chain job marketplace · IPFS deliverables.

> Prototype for education. Not audited — testnet funds only.
