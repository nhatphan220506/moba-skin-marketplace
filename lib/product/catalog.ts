export const featuredDesign = {
  id: 1,
  name: "Verdant Sentinel",
  artist: "0x7099…79C8",
  game: "Demo MOBA",
  status: "MARKET READY",
  edition: "1 / 1",
  primaryPrice: "150 MockVND",
  resalePrice: "200 MockVND",
  votes: 2,
  verified: true,
  description: "A publisher-authorised guardian concept with a limited, transferable in-game usage entitlement.",
};

export const lifecycle = ["Submitted", "Verified", "Publisher eligible", "Voting winner", "Agreement", "Technical approval", "Market ready"];

export const roleDestinations = [
  { href: "/studio", title: "Artist Studio", role: "ARTIST", copy: "Submit concepts, respond to revision requests and follow revenue." },
  { href: "/verify", title: "Verification Queue", role: "VERIFIER", copy: "Review provenance evidence and anchor human decisions." },
  { href: "/publisher", title: "Publisher Console", role: "PUBLISHER", copy: "Approve eligibility, record agreements and launch auctions." },
  { href: "/production", title: "Production and QA", role: "GAME DEVELOPER", copy: "Manage production versions and technical approval." },
  { href: "/community", title: "Community Voting", role: "FAN", copy: "Inspect eligible concepts and sign one-wallet-one-vote." },
  { href: "/account/inventory", title: "Buyer Inventory", role: "BUYER", copy: "Track bids, entitlements and private game-access delivery." },
  { href: "/account/selling", title: "Seller Centre", role: "SELLER", copy: "List owned entitlements and withdraw resale proceeds." },
  { href: "/admin", title: "Admin and Risk", role: "ADMIN", copy: "Operate voting, suspension, pause and indexer health." },
];

