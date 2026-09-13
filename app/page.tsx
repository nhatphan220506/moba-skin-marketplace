import { DEMO_CONFIG } from "@/config/demo";
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
      <section className="hero">
        <p className="eyebrow">M0 INTERFACE FREEZE</p>
        <h1>MOBA Skin Marketplace</h1>
        <p className="subtitle">
          Authorised community contribution, verifiable entitlements and transparent
          primary and resale settlement.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Baseline design</h2>
          <dl>
            <div><dt>Design</dt><dd>#{DEMO_CONFIG.identifiers.designId}</dd></div>
            <div><dt>State</dt><dd>{DesignStatus.DRAFT}</dd></div>
            <div><dt>Supply</dt><dd>{DEMO_CONFIG.identifiers.maxSupply}</dd></div>
            <div><dt>Currency</dt><dd>MockVND</dd></div>
          </dl>
        </article>

        <article className="panel">
          <h2>Market-ready gate</h2>
          <ul>{gates.map((gate) => <li key={gate}>{gate}</li>)}</ul>
        </article>
      </section>

      <section className="notice">
        This screen is intentionally functional-only. Final UI/UX begins after contracts,
        Kat APIs and Văn evidence output are integrated.
      </section>
    </main>
  );
}
