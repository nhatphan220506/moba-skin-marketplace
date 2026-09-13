export const BPS_DENOMINATOR = 10_000;
export const MOCK_VND_DECIMALS = 18;

export const DEMO_CONFIG = {
  identifiers: {
    designId: 1,
    votingRoundId: 1,
    auctionId: 1,
    tokenId: 1,
    resaleListingId: 1,
    maxSupply: 1,
  },
  auction: {
    reservePrice: "100",
    minimumIncrement: "10",
    buyerABid: "120",
    buyerBBid: "150",
  },
  primarySplitBps: {
    artist: 8_000,
    publisher: 1_000,
    marketplace: 1_000,
  },
  resale: {
    price: "200",
    splitBps: {
      seller: 9_000,
      artist: 500,
      publisher: 300,
      marketplace: 200,
    },
  },
  expectedHumanAmounts: {
    primary: {
      artist: "120",
      publisher: "15",
      marketplace: "15",
    },
    resale: {
      seller: "180",
      artist: "10",
      publisher: "6",
      marketplace: "4",
    },
  },
} as const;

export function assertDemoBps(): void {
  const primary = Object.values(DEMO_CONFIG.primarySplitBps).reduce((a, b) => a + b, 0);
  const resale = Object.values(DEMO_CONFIG.resale.splitBps).reduce((a, b) => a + b, 0);

  if (primary !== BPS_DENOMINATOR || resale !== BPS_DENOMINATOR) {
    throw new Error(`Invalid BPS configuration: primary=${primary}, resale=${resale}`);
  }
}
