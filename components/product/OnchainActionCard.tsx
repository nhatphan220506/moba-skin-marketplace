"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { explorerTransactionUrl } from "@/config/chains";
import { getContractAddress } from "@/config/contracts";
import { productActions, type ProductActionId } from "@/lib/product/actions";

export function OnchainActionCard({ actionId }: { actionId: ProductActionId }) {
  const action = productActions[actionId];
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const address = getContractAddress(chainId, action.contract);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(action.inputs.map((input) => [input.key, input.defaultValue])));
  const [localError, setLocalError] = useState("");
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const explorer = hash ? explorerTransactionUrl(chainId, hash) : null;
  const disabledReason = !isConnected ? "Connect wallet to sign" : !address ? "No deployment configured for this network" : null;
  const state = receipt.isSuccess ? "CONFIRMED" : receipt.isLoading ? "PENDING" : isPending ? "AWAITING SIGNATURE" : error || localError ? "REVERTED" : "IDLE";

  useEffect(() => {
    if (actionId !== "submit-design") return;
    function useUploadedEvidence(event: Event) {
      const detail = (event as CustomEvent<{ storageURI?: string; sha256?: string }>).detail;
      if (!detail?.storageURI || !detail.sha256) return;
      setValues((current) => ({ ...current, uri: detail.storageURI!, artwork: detail.sha256! }));
    }
    window.addEventListener("moba:evidence-uploaded", useUploadedEvidence);
    return () => window.removeEventListener("moba:evidence-uploaded", useUploadedEvidence);
  }, [actionId]);
  const args = useMemo(() => {
    try {
      const built = [...action.buildArgs(values, chainId)];
      return built.map((value) => value === "PRIMARY_ADDRESS" ? getContractAddress(chainId, "primary") : value === "SECONDARY_ADDRESS" ? getContractAddress(chainId, "secondary") : value);
    } catch { return []; }
  }, [action, chainId, values]);

  function submit() {
    setLocalError("");
    if (!address) return setLocalError("Contract is not deployed on the connected network.");
    if (args.some((value) => value === undefined)) return setLocalError("A dependent contract address is missing.");
    try {
      writeContract({ address, abi: action.abi, functionName: action.functionName, args } as never);
    } catch (caught) { setLocalError(caught instanceof Error ? caught.message : "Transaction could not be prepared."); }
  }

  return <article className="action-card">
    <div className="action-title"><div><span>ON-CHAIN ACTION</span><h3>{action.title}</h3></div><span className={`status status-${state.toLowerCase().replaceAll(" ", "-")}`}>{state}</span></div>
    <p>{action.description}</p>
    <div className="action-fields">{action.inputs.map((input) => <label key={input.key}>{input.label}<input type={input.type ?? "text"} value={values[input.key]} onChange={(event) => setValues((current) => ({ ...current, [input.key]: event.target.value }))} /></label>)}</div>
    {(localError || error) && <div className="inline-error">{localError || error?.message}</div>}
    {hash && <div className="tx-proof"><span>Transaction</span><code>{hash}</code>{explorer && <a href={explorer} target="_blank" rel="noreferrer">Open Etherscan ↗</a>}</div>}
    <button onClick={submit} disabled={Boolean(disabledReason) || isPending || receipt.isLoading}>{disabledReason ?? (receipt.isLoading ? "Waiting for confirmation…" : isPending ? "Confirm in wallet…" : "Review and sign")}</button>
  </article>;
}
