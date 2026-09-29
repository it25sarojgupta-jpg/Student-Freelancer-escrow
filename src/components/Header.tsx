"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from "wagmi";
import { formatEther } from "viem";
import { activeChain } from "@/lib/wagmi";
import { short } from "@/lib/types";

export default function Header() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: bal } = useBalance({ address });
  const wrong = isConnected && chainId !== activeChain.id;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 py-6">
      <div>
        <h1 className="text-2xl font-bold">🎓 Campus<span className="text-brand">Escrow</span></h1>
        <p className="text-sm text-slate-400">Get paid for your work. Hire students without the risk.</p>
      </div>
      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            {wrong ? (
              <button className="btn-danger" onClick={() => switchChain({ chainId: activeChain.id })}>Switch to {activeChain.name}</button>
            ) : (
              <span className="text-sm text-slate-300">{bal ? Number(formatEther(bal.value)).toFixed(3) : "…"} {activeChain.nativeCurrency.symbol}</span>
            )}
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{short(address!)}</span>
            <button className="btn-ghost" onClick={() => disconnect()}>Disconnect</button>
          </>
        ) : (
          <button className="btn-primary" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
            {isPending ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
