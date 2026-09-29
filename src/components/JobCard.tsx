"use client";
import { useState } from "react";
import { formatEther } from "viem";
import { STATUS, Job, short, fmtDate } from "@/lib/types";
import { useEscrowWrite } from "./useEscrowWrite";
import { activeChain } from "@/lib/wagmi";

const colors = ["bg-sky-500/20 text-sky-300", "bg-amber-500/20 text-amber-300", "bg-emerald-500/20 text-emerald-300",
  "bg-slate-500/20 text-slate-300", "bg-rose-500/20 text-rose-300", "bg-violet-500/20 text-violet-300"];

export default function JobCard({ job, me, arbiter, onChange }: { job: Job; me?: string; arbiter?: string; onChange: () => void }) {
  const [link, setLink] = useState("");
  const [share, setShare] = useState("");
  const { send, busy, error } = useEscrowWrite(onChange);
  const isClient = me?.toLowerCase() === job.client.toLowerCase();
  const isFree = me?.toLowerCase() === job.freelancer.toLowerCase();
  const isArb = me && arbiter && me.toLowerCase() === arbiter.toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const pastDeadline = now > Number(job.deadline);
  const reviewOver = job.status === 1 && now >= Number(job.submittedAt) + Number(job.reviewPeriod);
  const id = job.id;

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">Job #{id.toString()}</p>
          <h3 className="text-lg font-semibold">{job.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[job.status]}`}>{STATUS[job.status]}</span>
      </div>
      <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <p>💰 <b>{formatEther(job.amount)} {activeChain.nativeCurrency.symbol}</b></p>
        <p>⏰ Due {fmtDate(job.deadline)}</p>
        <p>🧑‍💼 Client {short(job.client)}{isClient && " (you)"}</p>
        <p>🎓 Student {short(job.freelancer)}{isFree && " (you)"}</p>
      </div>
      {job.deliverable && (
        <p className="text-sm">📎 Deliverable: <a className="text-brand underline break-all" target="_blank" rel="noreferrer"
          href={job.deliverable.startsWith("http") ? job.deliverable : undefined}>{job.deliverable}</a></p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {isFree && job.status === 0 && !pastDeadline && (
          <>
            <input className="input max-w-xs" placeholder="Link to your work (Drive, GitHub, IPFS)" value={link} onChange={(e) => setLink(e.target.value)} />
            <button className="btn-primary" disabled={busy || !link.trim()} onClick={() => send("submitWork", [id, link.trim()])}>Submit work</button>
          </>
        )}
        {isFree && job.status === 0 && <button className="btn-ghost" disabled={busy} onClick={() => send("declineJob", [id])}>Decline</button>}
        {isClient && job.status === 1 && <button className="btn-primary" disabled={busy} onClick={() => send("approve", [id])}>Approve & pay</button>}
        {isFree && job.status === 1 && <button className="btn-primary" disabled={busy || !reviewOver} onClick={() => send("claimAfterReview", [id])}>
          {reviewOver ? "Claim payment (client ghosted)" : `Auto-claim after ${fmtDate(job.submittedAt + job.reviewPeriod)}`}</button>}
        {isClient && job.status === 0 && pastDeadline && <button className="btn-primary" disabled={busy} onClick={() => send("refundAfterDeadline", [id])}>Refund (deadline missed)</button>}
        {(isClient || isFree) && (job.status === 0 || job.status === 1) && <button className="btn-danger" disabled={busy} onClick={() => send("raiseDispute", [id])}>Raise dispute</button>}
      </div>

      {isArb && job.status === 4 && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3">
          <div><label className="label">Amount to student ({activeChain.nativeCurrency.symbol}) — rest refunds client</label>
            <input className="input" type="number" step="0.01" max={formatEther(job.amount)} value={share} onChange={(e) => setShare(e.target.value)} /></div>
          <button className="btn-primary" disabled={busy || share === ""} onClick={() => send("resolveDispute", [id, BigInt(Math.round(Number(share) * 1e18))])}>Resolve dispute</button>
        </div>
      )}
      {busy && <p className="text-xs text-slate-400">Waiting for transaction…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
