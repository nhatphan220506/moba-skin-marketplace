"use client";

import { useEffect, useState } from "react";
import { formatEther, zeroHash } from "viem";
import { useAccount, useBalance, useChainId, useConnect, useDisconnect, useReadContracts, useSwitchChain } from "wagmi";

import { deploymentReady, getContractAddress } from "@/config/contracts";
import { accessControlAbi, paymentAbi } from "@/lib/blockchain/abis";
import { hasPrototypeAccess } from "@/lib/product/apiClient";

function shortAddress(value: string) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }

export function WalletControl() {
  const { address, isConnected } = useAccount();
  const [prototypeAccess, setPrototypeAccess] = useState(false);
  useEffect(() => {
    const refresh = () => setPrototypeAccess(hasPrototypeAccess(address));
    refresh();
    window.addEventListener("moba:prototype-access", refresh);
    return () => window.removeEventListener("moba:prototype-access", refresh);
  }, [address]);
  const chainId = useChainId();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const ready = deploymentReady(chainId);
  const nativeBalance = useBalance({ address });
  const registry = getContractAddress(chainId, "assetRegistry");
  const compatibility = getContractAddress(chainId, "compatibility");
  const voting = getContractAddress(chainId, "voting");
  const payment = getContractAddress(chainId, "payment");
  const roleDefinitions = [
    { label: "Artist", contract: registry, getter: "ARTIST_ROLE" },
    { label: "Verifier", contract: registry, getter: "VERIFIER_ROLE" },
    { label: "Publisher", contract: registry, getter: "PUBLISHER_ROLE" },
    { label: "Game developer", contract: compatibility, getter: "GAME_DEVELOPER_ROLE" },
    { label: "Fan", contract: voting, getter: "FAN_ROLE" },
  ] as const;
  const roleIds = useReadContracts({ contracts: roleDefinitions.map((role) => ({ address: role.contract, abi: accessControlAbi, functionName: role.getter })) });
  const roleChecks = useReadContracts({
    contracts: roleDefinitions.map((role, index) => ({ address: role.contract, abi: accessControlAbi, functionName: "hasRole", args: [(roleIds.data?.[index]?.result as `0x${string}` | undefined) ?? zeroHash, address!] })),
    query: { enabled: Boolean(address && ready && roleIds.isSuccess) },
  });
  const adminCheck = useReadContracts({ contracts: [registry, compatibility, voting].filter(Boolean).map((contract) => ({ address: contract!, abi: accessControlAbi, functionName: "hasRole", args: [zeroHash, address!] })), query: { enabled: Boolean(address && ready) } });
  const tokenBalance = useReadContracts({ contracts: payment && address ? [{ address: payment, abi: paymentAbi, functionName: "balanceOf", args: [address] }] : [], query: { enabled: Boolean(payment && address) } });
  const roles: string[] = prototypeAccess
    ? ["Admin", "Publisher", "Game team", "Verifier", "Artist", "Fan", "Seller"]
    : roleDefinitions.filter((_, index) => (roleChecks.data?.[index]?.result as unknown) === true).map((role) => role.label);
  if (!prototypeAccess && adminCheck.data?.some((result) => (result.result as unknown) === true)) roles.unshift("Admin");

  if (!isConnected) return <button className="wallet-button" disabled={isPending || connectors.length === 0} onClick={() => connectors[0] && connect({ connector: connectors[0] })}>{isPending ? "Connecting…" : "Connect wallet"}</button>;

  return <div className="wallet-control" title={`${nativeBalance.data ? Number(formatEther(nativeBalance.data.value)).toFixed(4) : "—"} ETH · ${tokenBalance.data?.[0]?.result ? formatEther(tokenBalance.data[0].result as bigint) : "—"} MockVND`}>
    <span className={ready ? "chain-dot ready" : "chain-dot"} />
    <button className="wallet-address" onClick={() => disconnect()} title="Disconnect wallet">{address ? shortAddress(address) : "Connected"}</button>
    <span className="wallet-network">{chainId === 11155111 ? "Sepolia" : chainId === 31337 ? "Hardhat" : `Chain ${chainId}`}</span>
    {roles.length > 0 && <span className="wallet-roles">{roles.join(" · ")}</span>}
    {chainId !== 11155111 && <button className="network-switch" onClick={() => switchChain({ chainId: 11155111 })}>Switch to Sepolia</button>}
  </div>;
}
