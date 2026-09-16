import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { HomeCatalog } from "@/components/product/HomeCatalog";
import { catalog, roleDestinations } from "@/lib/product/catalog";

const journey = [
  { no: "01", title: "Create", copy: "Artists upload private evidence and anchor a tamper-evident concept reference." },
  { no: "02", title: "Select", copy: "Human review, publisher eligibility and community voting shape the season." },
  { no: "03", title: "Produce", copy: "Game teams version production files and approve technical compatibility." },
  { no: "04", title: "Collect", copy: "Players bid or buy with wallet-signed settlement and transparent royalties." },
  { no: "05", title: "Play", copy: "Ownership is connected to a private game account without exposing player data." },
];

export default function HomePage() {
  return <main className="home-main">
    <section className="home-hero"><div className="hero-noise"/><div className="home-hero-copy"><div className="hero-badge"><span className="live-dot"/>LIVE ON SEPOLIA · SEASON 01</div><h1>Community-made.<br/><em>Game-ready.</em><br/>Truly yours.</h1><p>A trusted marketplace where artists shape the skins players want—and every approval, vote, sale and usage entitlement has a verifiable trail.</p><div className="hero-actions"><Link className="button-link" href="/explore">Explore the season <span>↗</span></Link><Link className="text-link" href="/studio">Submit your concept</Link></div><div className="trust-row"><span>Publisher authorised</span><span>Wallet settled</span><span>Privacy-aware</span></div></div><div className="hero-showcase"><div className="showcase-halo"/><ProductCard item={catalog[0]} featured/><div className="floating-proof"><span>✓</span><div><strong>Public proof</strong><small>19 Sepolia events indexed</small></div></div><div className="floating-price"><small>RESALE</small><strong>200 <i>MVND</i></strong></div></div></section>
    <section className="brand-strip"><span>ONE ECOSYSTEM</span><strong>Artists</strong><i>×</i><strong>Players</strong><i>×</i><strong>Publishers</strong><i>×</i><strong>Game teams</strong></section>
    <section className="home-section"><div className="section-lead"><div><p className="eyebrow">CURATED THIS SEASON</p><h2>Built by the community.<br/>Cleared for the game.</h2></div><Link className="text-link" href="/explore">View all season assets ↗</Link></div><HomeCatalog /><p className="catalog-disclosure">Market-ready indexed assets publish automatically when the dynamic backend is active. Additional season cards remain clearly marked as product previews.</p></section>
    <section className="journey-section"><div className="journey-copy"><p className="eyebrow">ONE CONNECTED LIFECYCLE</p><h2>From sketchbook<br/>to player inventory.</h2><p>The interface does not hide where blockchain ends and private services begin. Every participant gets the tools and context for their part of the same asset journey.</p><Link className="button-link" href="/evidence">See how proof works</Link></div><div className="journey-steps">{journey.map(item => <article key={item.no}><span>{item.no}</span><div><h3>{item.title}</h3><p>{item.copy}</p></div></article>)}</div></section>
    <section className="role-section"><div className="section-lead"><div><p className="eyebrow">CHOOSE YOUR SIDE</p><h2>One product, purpose-built workspaces.</h2></div><p>Public discovery stays simple. Operational tools appear only where the participant needs them.</p></div><div className="role-directory">{roleDestinations.map((item,index) => <Link href={item.href} key={item.href}><span>{String(index+1).padStart(2,"0")} · {item.role}</span><h3>{item.title}</h3><p>{item.copy}</p><b>Enter workspace ↗</b></Link>)}</div></section>
    <section className="final-cta"><div><span>THE NEXT SKIN STARTS WITH A PLAYER</span><h2>Shape the next season.</h2><p>Vote for community concepts, collect approved designs or bring your own idea into the forge.</p></div><div><Link className="button-link" href="/community">Join the community</Link><Link className="text-link" href="/studio">Create a concept</Link></div></section>
  </main>;
}
