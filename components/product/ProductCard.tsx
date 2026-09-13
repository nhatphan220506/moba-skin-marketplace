import Link from "next/link";

import { featuredDesign } from "@/lib/product/catalog";

export function ProductCard({ compact = false }: { compact?: boolean }) {
  return <article className={`market-card ${compact ? "compact-card" : ""}`}><div className="market-visual"><span>{featuredDesign.edition}</span><div className="mini-sigil" /><small>CHAIN VERIFIED</small></div><div className="market-copy"><p className="eyebrow">{featuredDesign.status}</p><h3>{featuredDesign.name}</h3><p>{featuredDesign.description}</p><dl><div><dt>Primary</dt><dd>{featuredDesign.primaryPrice}</dd></div><div><dt>Resale</dt><dd>{featuredDesign.resalePrice}</dd></div></dl><Link className="text-link" href={`/designs/${featuredDesign.id}`}>View design and evidence ↗</Link></div></article>;
}

