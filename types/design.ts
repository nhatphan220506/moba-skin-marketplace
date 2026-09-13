export enum DesignStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  REVISION_REQUIRED = "REVISION_REQUIRED",
  VERIFIED = "VERIFIED",
  INELIGIBLE = "INELIGIBLE",
  VOTING_ELIGIBLE = "VOTING_ELIGIBLE",
  VOTING = "VOTING",
  SELECTED = "SELECTED",
  AGREEMENT_RECORDED = "AGREEMENT_RECORDED",
  IN_PRODUCTION = "IN_PRODUCTION",
  TECHNICAL_REVIEW = "TECHNICAL_REVIEW",
  REWORK_REQUIRED = "REWORK_REQUIRED",
  MARKET_READY = "MARKET_READY",
  AUCTION_OPEN = "AUCTION_OPEN",
  ENTITLEMENT_ISSUED = "ENTITLEMENT_ISSUED",
  SUSPENDED = "SUSPENDED",
  CANCELLED = "CANCELLED",
}

export interface Design {
  designId: number;
  creatorAddress: `0x${string}`;
  metadataURI: string;
  artworkHash: `0x${string}`;
  aiDisclosureHash: `0x${string}`;
  provenanceHash: `0x${string}`;
  status: DesignStatus;
  verified: boolean;
  publisherEligible: boolean;
  votingWinner: boolean;
  agreementRecorded: boolean;
  technicallyApproved: boolean;
  suspended: boolean;
  maxSupply: number;
  createdAt: number;
  updatedAt: number;
}

export interface MarketEligibility {
  verified: boolean;
  publisherEligible: boolean;
  votingWinner: boolean;
  agreementRecorded: boolean;
  technicallyApproved: boolean;
  maxSupply: number;
  suspended: boolean;
}

export function isMarketReady(gate: MarketEligibility): boolean {
  return (
    gate.verified &&
    gate.publisherEligible &&
    gate.votingWinner &&
    gate.agreementRecorded &&
    gate.technicallyApproved &&
    gate.maxSupply > 0 &&
    !gate.suspended
  );
}
