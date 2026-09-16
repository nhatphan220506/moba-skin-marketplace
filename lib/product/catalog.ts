export type CatalogItem = {
  id: number;
  name: string;
  artist: string;
  game: string;
  status: "Market ready" | "Live auction" | "Community vote" | "In review" | "Production";
  edition: string;
  price: string;
  priceLabel: string;
  votes: number;
  description: string;
  palette: "verdant" | "ember" | "violet" | "ocean" | "solar" | "frost";
  source: "onchain-demo" | "onchain-live" | "product-preview";
  category: "Tank" | "Assassin" | "Mage" | "Marksman" | "Support";
  cardImage?: string;
  detailImage?: string;
  auctionId?: number;
};

export const catalog: CatalogItem[] = [
  { id: 1, name: "Verdant Sentinel", artist: "0x7099…79C8", game: "Demo MOBA", status: "Market ready", edition: "1 of 1", price: "200", priceLabel: "Resale price", votes: 2, category: "Tank", palette: "verdant", source: "onchain-demo", cardImage: "/assets/designs/01_Verdant_Sentinel.png", detailImage: "/assets/designs/01_Verdant_Sentinel_Detail_Mockup.png", description: "A publisher-authorised guardian concept with a limited, transferable in-game usage entitlement." },
  { id: 2, name: "Ashen Ronin", artist: "KiraStudio", game: "Demo MOBA", status: "Live auction", edition: "3 of 10", price: "145", priceLabel: "Current bid", votes: 384, category: "Assassin", palette: "ember", source: "product-preview", description: "A battle-worn duelist forged around reactive ember trails and precision combat effects." },
  { id: 3, name: "Astral Weaver", artist: "NovaLines", game: "Demo MOBA", status: "Community vote", edition: "Concept", price: "72%", priceLabel: "Community support", votes: 921, category: "Mage", palette: "violet", source: "product-preview", cardImage: "/assets/designs/03_Astral_Weaver.jpg", detailImage: "/assets/designs/03_Astral_Weaver_Detail_Mockup.png", description: "Celestial fabric and constellation magic shaped by the community selection season." },
  { id: 4, name: "Tidal Vanguard", artist: "NorthCurrent", game: "Demo MOBA", status: "Production", edition: "Edition 25", price: "QA v2", priceLabel: "Production stage", votes: 612, category: "Tank", palette: "ocean", source: "product-preview", description: "Deep-water armour, bioluminescent accents and a publisher-approved combat silhouette." },
  { id: 5, name: "Solar Requiem", artist: "Atelier IX", game: "Demo MOBA", status: "In review", edition: "Concept", price: "4 files", priceLabel: "Evidence package", votes: 0, category: "Marksman", palette: "solar", source: "product-preview", cardImage: "/assets/designs/05_Solar_Requiem.jpeg", detailImage: "/assets/designs/05_Solar_Requiem_Detail_Mockup.png", description: "A ceremonial marksman concept entering provenance and publisher eligibility review." },
  { id: 6, name: "Frostbound Oracle", artist: "BlueHour", game: "Demo MOBA", status: "Community vote", edition: "Concept", price: "61%", priceLabel: "Community support", votes: 703, category: "Support", palette: "frost", source: "product-preview", description: "An icebound seer with readable team effects and a restrained competitive silhouette." },
];

export const featuredDesign = { ...catalog[0], primaryPrice: "150 MockVND", resalePrice: "200 MockVND", verified: true };
export const lifecycle = ["Submitted", "Verified", "Publisher eligible", "Voting winner", "Agreement", "Technical approval", "Market ready"];

export const roleDestinations = [
  { href: "/account/inventory", title: "Player Hub", role: "PLAYER", copy: "Bid, buy, connect a game account and manage usage entitlements." },
  { href: "/studio", title: "Creator Studio", role: "ARTIST", copy: "Upload evidence, submit concepts and follow commercial revenue." },
  { href: "/verify", title: "Review Desk", role: "VERIFIER", copy: "Pre-screen provenance and anchor accountable human decisions." },
  { href: "/publisher", title: "Publisher Ops", role: "PUBLISHER", copy: "Approve eligibility, agreements, releases and market launches." },
  { href: "/production", title: "Game Production", role: "GAME TEAM", copy: "Manage production versions and technical compatibility review." },
  { href: "/community", title: "Community", role: "FAN", copy: "Discover candidates and cast a wallet-signed vote." },
  { href: "/account/selling", title: "Seller Centre", role: "SELLER", copy: "List owned entitlements and collect resale proceeds." },
  { href: "/admin", title: "Protocol Console", role: "ADMIN", copy: "Monitor indexing, govern rounds and operate emergency controls." },
];

export function catalogSourceLabel(source: CatalogItem["source"]): string {
  return source === "onchain-live" ? "Live on-chain asset" : source === "onchain-demo" ? "Executed demo asset" : "Product preview";
}
