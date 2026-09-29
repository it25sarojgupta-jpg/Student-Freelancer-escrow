"use client";
import { useState } from "react";
import { isAddress, parseEther } from "viem";
import { useEscrowWrite } from "./useEscrowWrite";
import { activeChain } from "@/lib/wagmi";

export default function CreateJob({ onCreated }: { onCreated: () => void }) {
  const [freelancer, setFreelancer] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [days, setDays] = useState("7");
  const [reviewMins, setReviewMins] = useState("4320"); // 3 days
  const { send, busy, error } = useEscrowWrite(() => { setTitle(""); onCreated(); });

  const valid = isAddress(freelancer) && title.trim().length > 0 && Number(amount) > 0 && Number(days) > 0 && Number(reviewMins) >= 1;

  const submit = () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000 + Number(days) * 86400));
    const review = BigInt(Math.floor(Number(reviewMins) * 60));
    send("createJob", [freelancer, title.trim(), deadline, review], parseEther(amount));
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Hire a student — lock payment in escrow</h2>
      <div><label className="label">Student wallet address</label>
        <input className="input" placeholder="0x…" value={freelancer} onChange={(e) => setFreelancer(e.target.value)} /></div>
      <div><label className="label">Job title</label>
        <input className="input" placeholder="e.g. Design a logo for my cafe" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label">Payment ({activeChain.nativeCurrency.symbol})</label>
          <input className="input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label className="label">Deadline (days)</label>
          <input className="input" type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} /></div>
        <div><label className="label">Review window (minutes)</label>
          <input className="input" type="number" min="1" value={reviewMins} onChange={(e) => setReviewMins(e.target.value)} /></div>
      </div>
      <p className="text-xs text-slate-400">If you don&apos;t review within the review window after delivery, the student can claim payment automatically. Use 1–2 minutes for a live demo.</p>
      <button className="btn-primary" disabled={!valid || busy} onClick={submit}>{busy ? "Confirm in wallet…" : "Lock funds & create job"}</button>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
