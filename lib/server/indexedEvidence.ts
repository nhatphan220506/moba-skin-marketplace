import { readFile } from "node:fs/promises";
import path from "node:path";

import { postgresEnabled, postgresPool } from "@/lib/server/postgres";
import type { EvidenceRow } from "@/types/evidence";

type RawEvidence = Omit<EvidenceRow, "blockNumber" | "designId" | "auctionId" | "tokenId"> & {
  blockNumber: string | number;
  designId?: string | number;
  auctionId?: string | number;
  tokenId?: string | number;
};

function normalized(row: RawEvidence): EvidenceRow {
  return {
    ...row,
    blockNumber: BigInt(row.blockNumber),
    designId: row.designId === undefined || row.designId === null ? undefined : Number(row.designId),
    auctionId: row.auctionId === undefined || row.auctionId === null ? undefined : Number(row.auctionId),
    tokenId: row.tokenId === undefined || row.tokenId === null ? undefined : Number(row.tokenId),
  };
}

export async function getIndexedEvidence(): Promise<EvidenceRow[]> {
  if (postgresEnabled()) {
    const result = await postgresPool().query(`SELECT transaction_hash AS "transactionHash", block_number AS "blockNumber", contract_name AS "contractName", event_name AS "eventName", COALESCE(actor, '0x0000000000000000000000000000000000000000') AS actor, design_id AS "designId", auction_id AS "auctionId", token_id AS "tokenId", amount::text, EXTRACT(EPOCH FROM block_timestamp)::int AS timestamp FROM indexed_events WHERE chain_id = 11155111 ORDER BY block_number DESC, log_index DESC LIMIT 500`);
    return result.rows.map(normalized);
  }
  try {
    const stored = JSON.parse(await readFile(path.join(process.cwd(), "data", "indexed-events.json"), "utf8")) as { events: RawEvidence[] };
    return stored.events.map(normalized).reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
