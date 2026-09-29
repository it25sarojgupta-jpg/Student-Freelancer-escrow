# 3-minute demo script

Prep: two MetaMask accounts (Client, Student), both with a little MON. Deployer/arbiter can be a third account.

1. **(15s) Problem** – "Students get ghosted; clients fear paying upfront."
2. **(30s) Client** – Connect wallet → *New job* → paste Student address, title, 0.1 MON, review window **1 minute** → *Lock funds*. Show tx on the Monad explorer.
3. **(30s) Student** – Switch account → *My jobs* → *Submit work* with a link.
4. **(30s) Happy path** – Switch to Client → *Approve & pay* → student balance increases.
5. **(45s) Ghosting protection** – Create a 2nd job → student submits → wait 1 min → Student clicks *Claim payment (client ghosted)*.
6. **(30s) Dispute** – 3rd job → submit → *Raise dispute* → switch to Arbiter → set 50/50 → *Resolve*.
7. **(15s) Close** – Contract, 12 tests, roadmap (milestones, USDC, reputation).

Tip: pre-create jobs before the live demo so you're never waiting on the faucet or a slow RPC.
