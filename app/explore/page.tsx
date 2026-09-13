import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";

export default function ExplorePage() {
  return <main className="product-main"><header className="product-heading"><div><p className="eyebrow">DISCOVER</p><h1>Explore verified designs</h1><p>Concepts, voting candidates, primary auctions and authorised resale listings in one public marketplace.</p></div><div className="workspace-meta"><span>Verified concepts</span><span>Publisher authorised</span><span>Public evidence</span></div></header><div className="filter-bar"><input aria-label="Search marketplace" placeholder="Search design, artist or game"/><select aria-label="Lifecycle"><option>All lifecycle states</option><option>Voting</option><option>Primary auction</option><option>Resale</option></select><select aria-label="Availability"><option>All availability</option><option>Available now</option><option>Completed</option></select></div><section className="market-grid"><ProductCard/><article className="market-empty"><span>COMING NEXT</span><h3>New publisher collection</h3><p>Additional designs appear only when indexed from a supported deployment.</p><Link href="/studio">Submit as an artist ↗</Link></article></section></main>;
}

