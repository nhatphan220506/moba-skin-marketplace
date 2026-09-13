import { defineChain } from "viem";
import { sepolia } from "viem/chains";

export const localHardhat = defineChain({
  id: 31_337,
  name: "Hardhat Local",
  nativeCurrency: { name: "Local Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_LOCAL_RPC_URL ?? "http://127.0.0.1:8545"] },
  },
  testnet: true,
});

export const supportedChains = [sepolia, localHardhat] as const;
export const defaultChainId = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? localHardhat.id);

export function explorerTransactionUrl(chainId: number, hash: string): string | null {
  if (chainId === sepolia.id) return `https://sepolia.etherscan.io/tx/${hash}`;
  return null;
}

export function explorerAddressUrl(chainId: number, address: string): string | null {
  if (chainId === sepolia.id) return `https://sepolia.etherscan.io/address/${address}`;
  return null;
}

