import Link from "next/link";
import { featuredDesign, type CatalogItem } from "@/lib/product/catalog";

export function ProductCard({ item = featuredDesign, featured = false, compact = false }: { item?: CatalogItem; featured?: boolean; compact?: boolean }) {
  return <article className={`collectible-card ${featured ? "featured" : ""} ${compact ? "compact-card" : ""}`}>
    <Link className={`collectible-art palette-${item.palette}`} href={`/designs/${item.id}`} aria-label={`View ${item.name}`}>
      <span className="art-index">NO. {String(item.id).padStart(2, "0")}</span><span className="art-edition">{item.edition}</span><div className="hero-mark"><i /><b /></div><span className="art-game">{item.game}</span>
    </Link>
    <div className="collectible-copy"><div className="card-status"><span className="live-dot" />{item.status}<small>{item.source === "onchain-demo" ? "Executed demo asset" : "Product preview"}</small></div><Link href={`/designs/${item.id}`}><h3>{item.name}</h3></Link><p>{item.description}</p><div className="card-creator"><span className="creator-avatar">{item.artist.slice(0, 2).toUpperCase()}</span><div><small>Created by</small><strong>{item.artist}</strong></div><span className="role-chip">{item.category}</span></div><div className="card-market"><div><small>{item.priceLabel}</small><strong>{item.price}{/^[0-9]+$/.test(item.price) ? " MockVND" : ""}</strong></div><Link href={`/designs/${item.id}`}>View asset <span>↗</span></Link></div></div>
  </article>;
}
