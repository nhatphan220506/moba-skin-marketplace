"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { apiFetch, dynamicApiAvailable } from "@/lib/product/apiClient";
import { useWalletSession } from "@/components/product/useWalletSession";
import type { DesignLifecycle } from "@/types/design";

const stageLabels: Record<string, string> = { DRAFT: "Draft", SUBMITTED: "Awaiting verification", REVISION_REQUIRED: "Revision required", VERIFIED: "Verified", VOTING_ELIGIBLE: "Voting eligible", SELECTED: "Community selected", AGREEMENT_RECORDED: "Agreement recorded", IN_PRODUCTION: "In production", TECHNICAL_REVIEW: "Technical review", MARKET_READY: "Market ready", AUCTION_OPEN: "Auction open", SOLD: "Sold", SUSPENDED: "Suspended" };

export function DesignQueue({ scope = "all", title = "Lifecycle queue" }: { scope?: "owner" | "all"; title?: string }) {
  const { address } = useAccount();
  const { ensureSession } = useWalletSession();
  const [records, setRecords] = useState<DesignLifecycle[]>([]);
  const [loading, setLoading] = useState(dynamicApiAvailable());
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!dynamicApiAvailable()) return;
    setLoading(true);
    try {
      const query = scope === "owner" && address ? `?owner=${address}` : "";
      if (scope === "owner" || address) await ensureSession();
      const response = await apiFetch(`/api/designs${query}`, {}, address);
      if (!response.ok) throw new Error(`Design service returned ${response.status}`);
      const body = await response.json() as { designs: DesignLifecycle[] };
      setRecords(body.designs); setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Design queue unavailable"); }
    finally { setLoading(false); }
  }, [address, ensureSession, scope]);
  useEffect(() => { void refresh(); const listener=()=>void refresh(); window.addEventListener("moba:lifecycle-updated", listener); return()=>window.removeEventListener("moba:lifecycle-updated", listener); }, [refresh]);
  if (!dynamicApiAvailable()) return <section className="backend-panel"><div className="backend-intro"><span>DYNAMIC BACKEND REQUIRED</span><h2>{title}</h2><p>The role queue is available when this project runs with its Next.js backend. GitHub Pages preserves the public storefront and on-chain wallet actions only.</p></div></section>;
  return <section className="backend-panel lifecycle-queue"><div className="backend-intro"><span>LIVE WORK QUEUE</span><h2>{title}</h2><p>Records are projected from private submission metadata and confirmed marketplace contract events.</p></div><button className="ghost queue-refresh" onClick={() => void refresh()}>Refresh queue</button>{loading ? <p className="queue-empty">Loading current lifecycle…</p> : error ? <p className="inline-error">{error}</p> : records.length === 0 ? <p className="queue-empty">No matching submissions yet.</p> : <div className="queue-list">{records.map(record => <Link href={record.designId ? `?designId=${record.designId}` : "#submission"} className="queue-row" key={record.localId}><div><span>{record.designId ? `DESIGN #${record.designId}` : "PRIVATE DRAFT"}</span><h3>{record.name}</h3><p>{record.game} · {record.category} · {record.fileName}</p></div><div><strong>{stageLabels[record.stage] ?? record.stage}</strong><small>{record.public ? "Published to marketplace" : "Not publicly listed"}</small></div></Link>)}</div>}</section>;
}
