import journey from "@/docs/integration/evidence/full-journey.json";
import { BlockchainEvidenceTable } from "@/components/technical/BlockchainEvidenceTable";
import type { EvidenceRow } from "@/types/evidence";
import { getIndexedEvidence } from "@/lib/server/indexedEvidence";

export default async function EvidencePage() {
  const indexedRows = await getIndexedEvidence();
  const snapshotRows: EvidenceRow[] = journey.evidence.map((row) => ({
    transactionHash: row.transactionHash as `0x${string}`,
    blockNumber: BigInt(row.blockNumber),
    contractName: row.contractName,
    eventName: row.eventName,
    actor: row.actor as `0x${string}`,
    designId: row.designId === undefined ? undefined : Number(row.designId),
    auctionId: row.auctionId === undefined ? undefined : Number(row.auctionId),
    tokenId: row.tokenId === undefined ? undefined : Number(row.tokenId),
    amount: row.amount,
    timestamp: row.timestamp,
  }));
  const rows = indexedRows.length ? indexedRows : snapshotRows;
  const source = indexedRows.length ? "Sepolia indexed events" : "Local verified snapshot";
  return <main className="product-main"><header className="product-heading"><div><p className="eyebrow">BLOCKCHAIN EVIDENCE</p><h1>Receipts, state and ownership</h1><p>Confirmed contract logs are decoded into an auditable product history. Until Sepolia is deployed, the executed local snapshot remains visible.</p></div><div className="workspace-meta"><span>{rows.length} events</span><span>{source}</span><span>No duplicate logs</span></div></header><div className="evidence-toolbar"><label>Search evidence<input placeholder="Transaction, actor or event" disabled/></label><label>Evidence source<select defaultValue={indexedRows.length ? "sepolia" : "local"} disabled><option value="local">Local verified snapshot</option><option value="sepolia">Sepolia indexed events</option></select></label><a className="button-link" href="/api/evidence" target="_blank">Evidence JSON</a></div><BlockchainEvidenceTable rows={rows}/><section className="notice"><strong>Evidence boundary</strong><span>Ownership and commercial transactions are on-chain. Game delivery is a private Kat record linked to confirmed entitlement events.</span></section></main>;
}
