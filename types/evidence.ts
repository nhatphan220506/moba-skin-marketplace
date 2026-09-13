export interface EvidenceRow {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  contractName: string;
  eventName: string;
  actor: `0x${string}`;
  designId?: number;
  auctionId?: number;
  tokenId?: number;
  amount?: string;
  stateBefore?: string;
  stateAfter?: string;
  timestamp?: number;
}

export type TransactionUiState =
  | "IDLE"
  | "AWAITING_SIGNATURE"
  | "PENDING"
  | "CONFIRMED"
  | "REVERTED";
