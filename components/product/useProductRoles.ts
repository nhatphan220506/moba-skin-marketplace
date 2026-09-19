"use client";

import { useEffect, useState } from "react";
import { zeroHash } from "viem";
import { useAccount, useChainId, useReadContracts } from "wagmi";

import { deploymentReady, getContractAddress } from "@/config/contracts";
import { accessControlAbi } from "@/lib/blockchain/abis";
import { hasPrototypeAccess } from "@/lib/product/apiClient";
import { rolePriority, roleWorkspaces } from "@/lib/product/roles";
import type { ProductRole } from "@/types/design";

export function useProductRoles() {
  const { address, isConnected } = useAccount();
  const [prototypeAccess, setPrototypeAccess] = useState(false);
  useEffect(() => {
    const refresh = () => setPrototypeAccess(hasPrototypeAccess(address));
    refresh();
    window.addEventListener("moba:prototype-access", refresh);
    return () => window.removeEventListener("moba:prototype-access", refresh);
  }, [address]);
  const chainId = useChainId();
  const ready = deploymentReady(chainId);
  const definitions = [
    { role: "ARTIST" as const, contract: getContractAddress(chainId, "assetRegistry"), getter: "ARTIST_ROLE" },
    { role: "VERIFIER" as const, contract: getContractAddress(chainId, "assetRegistry"), getter: "VERIFIER_ROLE" },
    { role: "PUBLISHER" as const, contract: getContractAddress(chainId, "assetRegistry"), getter: "PUBLISHER_ROLE" },
    { role: "GAME_TEAM" as const, contract: getContractAddress(chainId, "compatibility"), getter: "GAME_DEVELOPER_ROLE" },
    { role: "FAN" as const, contract: getContractAddress(chainId, "voting"), getter: "FAN_ROLE" },
  ];
  const roleIds = useReadContracts({ contracts: definitions.map(item => ({ address: item.contract, abi: accessControlAbi, functionName: item.getter })) });
  const checks = useReadContracts({ contracts: definitions.map((item, index) => ({ address: item.contract, abi: accessControlAbi, functionName: "hasRole", args: [(roleIds.data?.[index]?.result as `0x${string}` | undefined) ?? zeroHash, address!] })), query: { enabled: Boolean(address && ready && roleIds.isSuccess) } });
  const adminContracts = [getContractAddress(chainId, "assetRegistry"), getContractAddress(chainId, "compatibility"), getContractAddress(chainId, "voting")].filter(Boolean);
  const admin = useReadContracts({ contracts: adminContracts.map(contract => ({ address: contract!, abi: accessControlAbi, functionName: "hasRole", args: [zeroHash, address!] })), query: { enabled: Boolean(address && ready) } });
  const roles: ProductRole[] = isConnected ? (prototypeAccess ? [...rolePriority, "SELLER"] : ["PLAYER", "SELLER"]) : [];
  definitions.forEach((item, index) => { if ((checks.data?.[index]?.result as unknown) === true) roles.push(item.role); });
  if (admin.data?.some(result => (result.result as unknown) === true)) roles.push("ADMIN");
  const unique = [...new Set(roles)];
  const primaryRole = rolePriority.find(role => unique.includes(role)) ?? "PLAYER";
  return { address, chainId, isConnected, ready, roles: unique, primaryRole, primaryWorkspace: roleWorkspaces[primaryRole], loading: !prototypeAccess && isConnected && ready && (roleIds.isLoading || checks.isLoading || admin.isLoading) };
}
