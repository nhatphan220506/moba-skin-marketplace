export type AccountLinkStatus = "LINKED" | "UNLINKED";
export type ActivationStatus = "DELIVERY_PENDING" | "ACTIVE" | "REVOKED" | "FAILED";

export interface AccountLink {
  walletAddress: `0x${string}`;
  gameAccountId: string;
  linkedAt: number;
  status: AccountLinkStatus;
}

export interface ActivationRecord {
  activationId: string;
  walletAddress: `0x${string}`;
  gameAccountId: string;
  designId: number;
  tokenId: number;
  transactionHash: `0x${string}`;
  status: ActivationStatus;
  attemptCount: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}
