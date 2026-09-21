"use client";

import { useMemo, useState } from "react";
import { getAddress, isAddress, zeroHash } from "viem";
import { useAccount, useChainId, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { getContractAddress, type ContractKey } from "@/config/contracts";
import { accessControlAbi } from "@/lib/blockchain/abis";

const adminContracts: { key: Exclude<ContractKey, "secondary">; label: string }[] = [
  { key: "payment", label: "MockVND" },
  { key: "assetRegistry", label: "Asset Registry" },
  { key: "voting", label: "Community Voting" },
  { key: "compatibility", label: "Compatibility Registry" },
  { key: "entitlement", label: "Skin Entitlement" },
  { key: "primary", label: "Primary Auction" },
];

export function RelayerBootstrap() {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState("");
  const target = isAddress(input) ? getAddress(input) : undefined;
  const contracts = useMemo(() => adminContracts.map((item) => ({
    ...item,
    address: getContractAddress(chainId, item.key),
  })), [chainId]);
  const status = useReadContracts({
    contracts: contracts.map((item) => ({
      address: item.address,
      abi: accessControlAbi,
      functionName: "hasRole",
      args: [zeroHash, target!],
    })),
    query: { enabled: Boolean(target && chainId === 11155111) },
  });
  const currentIndex = target ? contracts.findIndex((_, index) => status.data?.[index]?.result !== true) : -1;
  const current = currentIndex >= 0 ? contracts[currentIndex] : undefined;
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  function grantCurrent() {
    setLocalError("");
    if (!target) return setLocalError("Enter a valid relayer wallet address.");
    if (!current?.address) return setLocalError(current ? `${current.label} is not configured.` : "All relayer admin roles are already granted.");
    writeContract({
      address: current.address,
      abi: accessControlAbi,
      functionName: "grantRole",
      args: [zeroHash, target],
    });
  }

  return <section className="workspace-panel">
    <p className="eyebrow">SEPOLIA OPERATIONS</p>
    <h2>Authorize backend role-granter</h2>
    <p>Grant the dedicated relayer admin authority one contract at a time. Each transaction is verified on Sepolia before the next contract becomes available.</p>
    <label>Relayer address<input value={input} onChange={(event) => { setInput(event.target.value.trim()); setLocalError(""); }} placeholder="0x…" /></label>
    <div className="tx-proof">
      <span>Connected admin</span><code>{connectedAddress || "Not connected"}</code>
      <span>Progress</span><code>{status.data?.filter((item) => item.result === true).length || 0} / {adminContracts.length}</code>
    </div>
    {(localError || error) && <div className="inline-error">{localError || error?.message}</div>}
    {hash && <div className="tx-proof"><span>Latest transaction</span><code>{hash}</code></div>}
    <button onClick={grantCurrent} disabled={!isConnected || chainId !== 11155111 || !target || !current || isPending || receipt.isLoading}>
      {!isConnected ? "Connect the admin wallet" : chainId !== 11155111 ? "Switch to Sepolia" : !target ? "Enter relayer address" : !current ? "Relayer authorized on every contract" : receipt.isLoading ? "Waiting for Sepolia confirmation…" : isPending ? "Confirm in MetaMask…" : `Grant admin on ${current.label}`}
    </button>
    {receipt.isSuccess && current && <p className="discover-success">Confirmed. Refresh this page to continue with the next contract.</p>}
  </section>;
}
