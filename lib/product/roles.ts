import type { ProductRole } from "@/types/design";

export const roleWorkspaces: Record<ProductRole, { label: string; href: string; description: string }> = {
  PLAYER: { label: "Buyer / Player", href: "/account/inventory", description: "Browse, bid, buy and activate owned usage entitlements." },
  ARTIST: { label: "Artist", href: "/studio", description: "Upload private evidence, submit concepts and track revenue." },
  VERIFIER: { label: "Verifier", href: "/verify", description: "Review provenance packages and anchor accountable decisions." },
  PUBLISHER: { label: "Publisher", href: "/publisher", description: "Approve eligibility, agreements and market launches." },
  GAME_TEAM: { label: "Game team", href: "/production", description: "Version production packages and approve compatibility." },
  FAN: { label: "Community voter", href: "/community", description: "Support eligible concepts with a wallet-signed vote." },
  SELLER: { label: "Seller", href: "/account/selling", description: "List owned entitlements and collect resale proceeds." },
  ADMIN: { label: "Marketplace admin", href: "/admin", description: "Monitor queues, settlements, contracts and emergency controls." },
};

export const rolePriority: ProductRole[] = ["ADMIN", "PUBLISHER", "GAME_TEAM", "VERIFIER", "ARTIST", "FAN", "PLAYER"];
