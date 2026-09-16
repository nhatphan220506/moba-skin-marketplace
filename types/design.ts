export type ProductRole = "PLAYER" | "ARTIST" | "VERIFIER" | "PUBLISHER" | "GAME_TEAM" | "FAN" | "SELLER" | "ADMIN";

export type DesignStage =
  | "DRAFT"
  | "SUBMITTED"
  | "REVISION_REQUIRED"
  | "VERIFIED"
  | "VOTING_ELIGIBLE"
  | "SELECTED"
  | "AGREEMENT_RECORDED"
  | "IN_PRODUCTION"
  | "TECHNICAL_REVIEW"
  | "MARKET_READY"
  | "AUCTION_OPEN"
  | "SOLD"
  | "SUSPENDED";

export type DesignSubmission = {
  localId: string;
  designId?: number;
  creatorWallet: string;
  name: string;
  description: string;
  game: string;
  category: "Tank" | "Assassin" | "Mage" | "Marksman" | "Support";
  edition: string;
  fileId: string;
  fileName: string;
  storageURI: string;
  artworkHash: `0x${string}`;
  aiDisclosure: string;
  provenance: string;
  authorizationSignature: `0x${string}`;
  createdAt: number;
  updatedAt: number;
};

export type DesignLifecycle = DesignSubmission & {
  stage: DesignStage;
  public: boolean;
  suspended: boolean;
  transactionHash?: string;
  auctionId?: number;
  gates: {
    submitted: boolean;
    verified: boolean;
    publisherEligible: boolean;
    votingWinner: boolean;
    agreementRecorded: boolean;
    productionSubmitted: boolean;
    technicalApproved: boolean;
    auctionOpen: boolean;
    sold: boolean;
  };
};
