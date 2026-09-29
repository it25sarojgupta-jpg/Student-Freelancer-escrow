"use client";
import { useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import Header from "@/components/Header";
import CreateJob from "@/components/CreateJob";
import JobCard from "@/components/JobCard";
import { escrowAbi } from "@/lib/abi";
import { CONTRACT_ADDRESS, activeChain } from "@/lib/wagmi";
import type { Job } from "@/lib/types";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"jobs" | "create">("jobs");
  const contract = { address: CONTRACT_ADDRESS, abi: escrowAbi, chainId: activeChain.id } as const;
  const enabled = !!CONTRACT_ADDRESS;

  const ids = useReadContract({ ...contract, functionName: "getJobIdsOf", args: [address!], query: { enabled: enabled && !!address } });
  const arbiter = useReadContract({ ...contract, functionName: "arbiter", query: { enabled } });
  const jobsQ = useReadContracts({
    contracts: ((ids.data as readonly bigint[]) ?? []).map((id) => ({ ...contract, functionName: "getJob", args: [id] }) as const),
    query: { enabled: enabled && !!ids.data?.length },
  });
  const jobs = (jobsQ.data ?? []).map((r) => r.result as Job | undefined).filter(Boolean).reverse() as Job[];
  const refresh = () => { ids.refetch().then(() => jobsQ.refetch()); };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20">
      <Header />
      {!enabled && (
        <div className="card mb-6 border-amber-400/40 text-amber-200">
          Set <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> in <code>.env</code> after deploying, then restart <code>npm run dev</code>.
        </div>
      )}
      <section className="card mb-6 grid gap-4 text-sm sm:grid-cols-3">
        <div><p className="text-2xl">🔒</p><b>Client locks funds</b><p className="text-slate-400">Money sits in the smart contract, not with anyone.</p></div>
        <div><p className="text-2xl">📤</p><b>Student delivers</b><p className="text-slate-400">Submit a link. Client approves and pays instantly.</p></div>
        <div><p className="text-2xl">⚖️</p><b>Protected both ways</b><p className="text-slate-400">Auto-pay if ghosted, refund if missed, arbiter for disputes.</p></div>
      </section>

      {!isConnected ? (
        <p className="text-center text-slate-400">Connect your wallet to hire or get hired.</p>
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <button className={tab === "jobs" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("jobs")}>My jobs ({jobs.length})</button>
            <button className={tab === "create" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("create")}>+ New job</button>
            <button className="btn-ghost ml-auto" onClick={refresh}>↻ Refresh</button>
          </div>
          {tab === "create" ? (
            <CreateJob onCreated={() => { refresh(); setTab("jobs"); }} />
          ) : jobs.length === 0 ? (
            <p className="text-center text-slate-400">No jobs yet. Create one as a client, or share your address with a client.</p>
          ) : (
            <div className="space-y-4">{jobs.map((j) => <JobCard key={j.id.toString()} job={j} me={address} arbiter={arbiter.data as string | undefined} onChange={refresh} />)}</div>
          )}
        </>
      )}
      <footer className="mt-12 text-center text-xs text-slate-500">Prototype on {activeChain.name} · testnet funds only · not audited</footer>
    </main>
  );
}
