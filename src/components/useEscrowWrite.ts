"use client";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect } from "react";
import { escrowAbi } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/wagmi";

/** Small wrapper: send a tx to the escrow contract, wait for it, then call onDone. */
export function useEscrowWrite(onDone?: () => void) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => { if (isSuccess) { onDone?.(); } /* eslint-disable-next-line */ }, [isSuccess]);

  const send = (functionName: string, args: unknown[], value?: bigint) =>
    writeContract({ address: CONTRACT_ADDRESS, abi: escrowAbi, functionName: functionName as never, args: args as never, value });

  return { send, busy: isPending || mining, error: error ? (error as { shortMessage?: string }).shortMessage || error.message : null, reset, hash };
}
