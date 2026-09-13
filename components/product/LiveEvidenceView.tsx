"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BlockchainEvidenceTable } from "@/components/technical/BlockchainEvidenceTable";
import type { EvidenceRow } from "@/types/evidence";

export type SerializableEvidenceRow = Omit<EvidenceRow, "blockNumber"> & {
  blockNumber: string;
};

type EvidencePayload = {
  source?: string;
  evidence?: SerializableEvidenceRow[];
};

function deserialize(rows: SerializableEvidenceRow[]): EvidenceRow[] {
  return rows.map((row) => ({ ...row, blockNumber: BigInt(row.blockNumber) }));
}

export function LiveEvidenceView({
  initialRows,
  initialSource,
}: {
  initialRows: SerializableEvidenceRow[];
  initialSource: string;
}) {
  const [rows, setRows] = useState(() => deserialize(initialRows));
  const [source, setSource] = useState(initialSource);
  const [query, setQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/evidence", { cache: "no-store" });
      if (!response.ok) throw new Error("Evidence refresh failed");
      const payload = (await response.json()) as EvidencePayload;
      if (Array.isArray(payload.evidence)) {
        setRows(deserialize(payload.evidence));
        setSource(payload.source === "sepolia-indexer" ? "Sepolia indexed events" : "Local verified snapshot");
        setLastUpdated(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
    const interval = window.setInterval(() => refresh().catch(() => undefined), 8_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.eventName, row.contractName, row.actor, row.transactionHash, row.designId, row.tokenId]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [query, rows]);

  return (
    <main className="product-main">
      <header className="product-heading">
        <div>
          <p className="eyebrow">BLOCKCHAIN EVIDENCE</p>
          <h1>Receipts, state and ownership</h1>
          <p>Confirmed contract logs are decoded into an auditable product history. New indexed receipts appear here automatically.</p>
        </div>
        <div className="workspace-meta">
          <span>{rows.length} events</span>
          <span>{source}</span>
          <span>{refreshing ? "Checking Sepolia…" : lastUpdated ? `Live · ${lastUpdated.toLocaleTimeString()}` : "Live sync enabled"}</span>
        </div>
      </header>
      <div className="evidence-toolbar">
        <label>Search evidence<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Transaction, actor or event" /></label>
        <label>Evidence source<select value={source === "Sepolia indexed events" ? "sepolia" : "local"} disabled><option value="local">Local verified snapshot</option><option value="sepolia">Sepolia indexed events</option></select></label>
        <button className="ghost" onClick={() => refresh()} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh now"}</button>
        <a className="button-link" href="/api/evidence" target="_blank">Evidence JSON</a>
      </div>
      <BlockchainEvidenceTable rows={filteredRows} />
      <section className="notice"><strong>Evidence boundary</strong><span>Ownership and commercial transactions are on-chain. Game delivery is a private Kat record linked to confirmed entitlement events.</span></section>
    </main>
  );
}
