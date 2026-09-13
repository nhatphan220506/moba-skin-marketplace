import type { Address } from "viem";

import localhost from "@/deployments/localhost.json";
import sepolia from "@/deployments/sepolia.json";

export type ContractKey = "payment" | "assetRegistry" | "voting" | "compatibility" | "entitlement" | "primary" | "secondary";
type Deployment = { chainId: number; contracts: Partial<Record<ContractKey, string>> };

const localDeployment = localhost as Deployment;
const sepoliaDeployment = sepolia as Deployment;

const sepoliaContracts: Partial<Record<ContractKey, string | undefined>> = {
  payment: process.env.NEXT_PUBLIC_SEPOLIA_MOCK_VND_ADDRESS || sepoliaDeployment.contracts.payment,
  assetRegistry: process.env.NEXT_PUBLIC_SEPOLIA_ASSET_REGISTRY_ADDRESS || sepoliaDeployment.contracts.assetRegistry,
  voting: process.env.NEXT_PUBLIC_SEPOLIA_VOTING_ADDRESS || sepoliaDeployment.contracts.voting,
  compatibility: process.env.NEXT_PUBLIC_SEPOLIA_COMPATIBILITY_REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_SEPOLIA_COMPATIBILITY_ADDRESS || sepoliaDeployment.contracts.compatibility,
  entitlement: process.env.NEXT_PUBLIC_SEPOLIA_ENTITLEMENT_ADDRESS || sepoliaDeployment.contracts.entitlement,
  primary: process.env.NEXT_PUBLIC_SEPOLIA_PRIMARY_AUCTION_ADDRESS || sepoliaDeployment.contracts.primary,
  secondary: process.env.NEXT_PUBLIC_SEPOLIA_SECONDARY_MARKETPLACE_ADDRESS || sepoliaDeployment.contracts.secondary,
};

function validAddress(value?: string): value is Address {
  return Boolean(value && /^0x[0-9a-fA-F]{40}$/.test(value));
}

export function getContractAddress(chainId: number, key: ContractKey): Address | undefined {
  const value = chainId === localDeployment.chainId ? localDeployment.contracts[key] : chainId === 11155111 ? sepoliaContracts[key] : undefined;
  return validAddress(value) ? value : undefined;
}

export function deploymentReady(chainId: number): boolean {
  return (["payment", "assetRegistry", "voting", "compatibility", "entitlement", "primary", "secondary"] as ContractKey[])
    .every((key) => Boolean(getContractAddress(chainId, key)));
}
