import { DEMO_CONFIG } from "@/config/demo";
import { KatIntegrationDashboard } from "@/components/ui/KatIntegrationDashboard";
import { FullJourneyDashboard } from "@/components/ui/FullJourneyDashboard";
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
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="MOBA Forge home"><span>MF</span><strong>MOBA FORGE</strong></a>
        <div><a href="#journey">Marketplace</a><a href="#evidence">Evidence</a><a href="#services">Operations</a></div>
        <span className="network-pill"><i /> Local chain · 31337</span>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">PUBLISHER-AUTHORISED · COMMUNITY-CREATED</p>
          <h1>Own the right.<br /><em>Prove the journey.</em></h1>
          <p className="subtitle">A working marketplace prototype where design approvals, community selection, settlement, royalties and limited usage entitlements become verifiable blockchain state.</p>
          <div className="hero-actions"><a className="button-link" href="#journey">Enter live prototype</a><a className="text-link" href="#evidence">Inspect evidence <span>↘</span></a></div>
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

      <FullJourneyDashboard />
      <div id="services"><KatIntegrationDashboard /></div>
    </main>
  );
}
