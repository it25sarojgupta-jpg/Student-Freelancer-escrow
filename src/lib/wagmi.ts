import { createConfig, http, fallback } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";
import { hardhat } from "viem/chains";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz", "https://testnet-rpc.monadinfra.com", "https://rpc.ankr.com/monad_testnet"],
    },
  },
  blockExplorers: { default: { name: "MonadExplorer", url: "https://testnet.monadexplorer.com" } },
  testnet: true,
});

export const isLocal = process.env.NEXT_PUBLIC_CHAIN === "local";
export const activeChain = isLocal ? hardhat : monadTestnet;

export const wagmiConfig = createConfig({
  chains: [monadTestnet, hardhat],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: fallback(monadTestnet.rpcUrls.default.http.map((u) => http(u))),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as `0x${string}`;
