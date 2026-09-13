import journey from "@/docs/integration/evidence/full-journey.json";
import { LiveEvidenceView, type SerializableEvidenceRow } from "@/components/product/LiveEvidenceView";
import type { EvidenceRow } from "@/types/evidence";
import { getIndexedEvidence } from "@/lib/server/indexedEvidence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const serializableRows: SerializableEvidenceRow[] = rows.map((row) => ({ ...row, blockNumber: row.blockNumber.toString() }));
  return <LiveEvidenceView initialRows={serializableRows} initialSource={source} />;
}
