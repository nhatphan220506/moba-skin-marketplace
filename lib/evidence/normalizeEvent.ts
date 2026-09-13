import type { EvidenceRow } from "@/types/evidence";

export type ParsedEvidenceEvent = {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
  contractName: string;
  eventName: string;
  actor: `0x${string}`;
  args: Record<string, unknown>;
  timestamp?: number;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
};

const asAmount = (args: Record<string, unknown>): string | undefined => {
  for (const key of ["amount", "finalPrice", "price", "highestBid", "reservePrice"]) {
    const value = args[key];
    if (typeof value === "bigint" || typeof value === "number" || typeof value === "string") return String(value);
  }
  return undefined;
};

export function normalizeEvent(event: ParsedEvidenceEvent): EvidenceRow {
  return {
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    contractName: event.contractName,
    eventName: event.eventName,
    actor: event.actor,
    designId: asNumber(event.args.designId),
    auctionId: asNumber(event.args.auctionId),
    tokenId: asNumber(event.args.tokenId),
    amount: asAmount(event.args),
    timestamp: event.timestamp,
  };
}
