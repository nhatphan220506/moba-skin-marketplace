export type AuctionStatus =
  | "SCHEDULED"
  | "OPEN"
  | "SETTLED"
  | "UNSOLD"
  | "CANCELLED";

export interface PrimaryAuction {
  auctionId: number;
  designId: number;
  reservePrice: string;
  minimumIncrement: string;
  startTime: number;
  endTime: number;
  highestBid: string;
  highestBidder?: `0x${string}`;
  status: AuctionStatus;
}

export interface ResaleListing {
  listingId: number;
  designId: number;
  tokenId: number;
  seller: `0x${string}`;
  price: string;
  active: boolean;
}
