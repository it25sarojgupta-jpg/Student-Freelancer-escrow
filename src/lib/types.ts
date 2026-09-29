export const STATUS = ["Funded", "Submitted", "Released", "Refunded", "Disputed", "Resolved"] as const;
export type Job = {
  id: bigint; client: `0x${string}`; freelancer: `0x${string}`; amount: bigint;
  deadline: bigint; reviewPeriod: bigint; submittedAt: bigint; status: number;
  title: string; deliverable: string;
};
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const fmtDate = (s: bigint) => new Date(Number(s) * 1000).toLocaleString();
