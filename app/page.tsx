import { DEMO_CONFIG } from "@/config/demo";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { roleDestinations } from "@/lib/product/catalog";
import { DesignStatus } from "@/types/design";

const gates = [
  "Verified by human verifier",
  "Publisher concept eligible",
  "Community voting winner",
  "Commercial agreement recorded",
  "Production technically approved",
  "Maximum supply configured",
  "Design is not suspended",
];

export default function HomePage() {
  return (
    <main>
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">PUBLISHER-AUTHORISED · COMMUNITY-CREATED</p>
          <h1>Own the right.<br /><em>Prove the journey.</em></h1>
          <p className="subtitle">A working marketplace prototype where design approvals, community selection, settlement, royalties and limited usage entitlements become verifiable blockchain state.</p>
          <div className="hero-actions"><Link className="button-link" href="/explore">Explore marketplace</Link><Link className="text-link" href="/evidence">Inspect evidence <span>↘</span></Link></div>
          <div className="hero-metrics"><div><strong>22</strong><span>verified steps</span></div><div><strong>7</strong><span>smart contracts</span></div><div><strong>58</strong><span>passing tests</span></div></div>
        </div>
        <div className="hero-art" aria-label="Featured entitlement card">
          <div className="orb orb-one" /><div className="orb orb-two" />
          <div className="skin-card">
            <div className="card-label"><span>01 / 01</span><span>DESIGN #1</span></div>
            <div className="sigil"><span /><i /><b /></div>
            <div className="card-copy"><small>LIMITED USAGE ENTITLEMENT</small><strong>Verdant<br />Sentinel</strong><p>Publisher-approved · ERC-1155</p></div>
            <div className="verified-seal">✓<span>CHAIN<br />VERIFIED</span></div>
          </div>
        </div>
      </section>

      <section className="grid overview-grid">
        <article className="panel">
          <p className="panel-kicker">ASSET PROFILE</p><h2>Baseline design</h2>
          <dl>
            <div><dt>Design</dt><dd>#{DEMO_CONFIG.identifiers.designId}</dd></div>
            <div><dt>State</dt><dd>{DesignStatus.DRAFT}</dd></div>
            <div><dt>Supply</dt><dd>{DEMO_CONFIG.identifiers.maxSupply}</dd></div>
            <div><dt>Currency</dt><dd>MockVND</dd></div>
          </dl>
        </article>

        <article className="panel">
          <p className="panel-kicker">CONTRACT ENFORCEMENT</p><h2>Market-ready gate</h2>
          <ul>{gates.map((gate) => <li key={gate}>{gate}</li>)}</ul>
        </article>
      </section>

      <section className="notice"><strong>Important boundary</strong><span>Blockchain ownership and off-chain game access are displayed separately. This local deterministic prototype represents a limited usage entitlement—not copyright or ownership of game IP.</span></section>

      <section className="home-market"><div className="section-heading"><p className="eyebrow">FEATURED MARKET</p><h2>One asset. A complete verifiable lifecycle.</h2><p>Follow the publisher-authorised path from community concept to primary settlement and controlled resale.</p></div><ProductCard /></section>
      <section className="home-roles"><div className="section-heading"><p className="eyebrow">MULTI-SIDED PRODUCT</p><h2>A workspace for every participant</h2><p>Public discovery connects directly to wallet-aware operational areas. Contracts—not hidden frontend rules—remain the authority.</p></div><div className="role-directory">{roleDestinations.map((item) => <Link href={item.href} key={item.href}><span>{item.role}</span><h3>{item.title}</h3><p>{item.copy}</p><b>Open workspace ↗</b></Link>)}</div></section>
      <section className="demo-cta"><div><p className="eyebrow">ASSESSMENT MODE</p><h2>Need the deterministic full journey?</h2><p>The local 22-step runner, exact accounting and Kat console remain available as a separate verification environment.</p></div><Link className="button-link" href="/demo">Open verified demo</Link></section>
    </main>
  );
}
