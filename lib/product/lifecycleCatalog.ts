import type { CatalogItem } from "@/lib/product/catalog";
import type { DesignLifecycle } from "@/types/design";

const palettes: CatalogItem["palette"][] = ["verdant", "ember", "violet", "ocean", "solar", "frost"];

export function lifecycleToCatalog(record: DesignLifecycle): CatalogItem | null {
  if (!record.public || !record.designId) return null;
  return {
    id: record.designId,
    name: record.name,
    artist: `${record.creatorWallet.slice(0, 6)}…${record.creatorWallet.slice(-4)}`,
    game: record.game,
    status: record.stage === "AUCTION_OPEN" ? "Live auction" : "Market ready",
    edition: record.edition,
    price: record.stage === "AUCTION_OPEN" ? "Open" : "Approved",
    priceLabel: record.stage === "AUCTION_OPEN" ? "Primary auction" : "Market gate",
    votes: 0,
    description: record.description,
    palette: palettes[(record.designId - 1) % palettes.length],
    source: "onchain-live",
    category: record.category,
    cardImage: `/api/files/content/${record.fileId}`,
    detailImage: `/api/files/content/${record.fileId}`,
    auctionId: record.auctionId,
  };
}
