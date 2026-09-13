"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BlockchainEvidenceTable } from "@/components/technical/BlockchainEvidenceTable";
import type { EvidenceRow, TransactionUiState } from "@/types/evidence";

type DemoRole = "ADMIN" | "ARTIST" | "VERIFIER" | "PUBLISHER" | "GAME_DEVELOPER" | "FAN" | "BUYER_SELLER";
type JourneyStep = {
  number: number; actor: string; role: string; action: string; service: string;
  transactionHash?: `0x${string}`; blockNumber?: number; stateBefore?: string; stateAfter?: string;
  classification: string; result: string; amount?: string; offchainEvidence?: Record<string, unknown>;
};
type Journey = {
  result: string; completedSteps?: number; totalSteps?: number; steps: JourneyStep[];
  evidence: Array<Omit<EvidenceRow, "blockNumber"> & { blockNumber: string | number }>;
  deployment: { chainId: number; contracts: Record<string, string> };
  accounting: { primary?: Record<string, string> | null; resale?: Record<string, string> | null };
  additionalChecks?: { adminRisk?: { result: string; actions: string[]; evidencePreserved: boolean; entitlementBalancePreserved: boolean } };
  finalState: { owner?: string | null; buyerBEntitlement?: string; buyerCEntitlement?: string; buyerBGameAccess: string; buyerCGameAccess: string; listingActive?: boolean };
};

const demoActors: Record<DemoRole, string> = {
  ADMIN: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  ARTIST: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  VERIFIER: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  PUBLISHER: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  GAME_DEVELOPER: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  FAN: "0x9965507D1a55bcC2695F58ba16FB37d819B0A4dc",
  BUYER_SELLER: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
};

const workflow = [
  { number: 1, phase: "Creation", role: "ARTIST", title: "Submit design evidence", detail: "Upload through Kat, then record URI and provenance hashes in AssetRegistry." },
  { number: 2, phase: "Trust", role: "VERIFIER", title: "Verify design", detail: "Persist the human report off-chain and anchor its report hash on-chain." },
  { number: 3, phase: "Publisher", role: "PUBLISHER", title: "Approve concept eligibility", detail: "Record the publisher review hash and unlock voting eligibility." },
  { number: 4, phase: "Community", role: "ADMIN", title: "Open voting round", detail: "Create the time-boxed round with Design #1 as an eligible candidate." },
  { number: 5, phase: "Community", role: "FAN", title: "Fan A votes", detail: "Record the first one-wallet-one-vote transaction." },
  { number: 6, phase: "Community", role: "FAN", title: "Fan B votes", detail: "Record the second independent vote." },
  { number: 7, phase: "Community", role: "ADMIN", title: "Finalize winner", detail: "Close voting after the deadline and record Design #1 as winner." },
  { number: 8, phase: "Rights", role: "PUBLISHER", title: "Record commercial agreement", detail: "Anchor the agreement hash plus 80% primary and 5% resale artist terms." },
  { number: 9, phase: "Production", role: "PUBLISHER", title: "Create production record", detail: "Create the versioned 3D production package in Kat off-chain storage." },
  { number: 10, phase: "Production", role: "GAME_DEVELOPER", title: "Approve compatibility", detail: "Anchor production hashes, approved game and maxSupply = 1." },
  { number: 11, phase: "Primary", role: "PUBLISHER", title: "Open primary auction", detail: "The contract checks every market-ready gate before opening." },
  { number: 12, phase: "Primary", role: "BUYER_SELLER", title: "Buyer A bids 120", detail: "Approve MockVND and move the bid into contract escrow." },
  { number: 13, phase: "Primary", role: "BUYER_SELLER", title: "Buyer B bids 150", detail: "Replace the leading bid and credit Buyer A's pull refund." },
  { number: 14, phase: "Primary", role: "BUYER_SELLER", title: "Buyer A withdraws refund", detail: "Return exactly 120 MockVND through the pull-payment path." },
  { number: 15, phase: "Primary", role: "ADMIN", title: "Settle and mint", detail: "Settle after deadline and mint the ERC-1155 entitlement to Buyer B." },
  { number: 16, phase: "Primary", role: "ADMIN", title: "Release primary proceeds", detail: "Verify and withdraw the exact 120 / 15 / 15 distribution." },
  { number: 17, phase: "Delivery", role: "BUYER_SELLER", title: "Activate Buyer B", detail: "Use the confirmed mint receipt to activate game access off-chain." },
  { number: 18, phase: "Resale", role: "BUYER_SELLER", title: "List entitlement for 200", detail: "Create an authorised listing while Buyer B remains owner." },
  { number: 19, phase: "Resale", role: "BUYER_SELLER", title: "Buyer C purchases", detail: "Atomically collect payment and transfer the entitlement." },
  { number: 20, phase: "Resale", role: "ADMIN", title: "Release resale proceeds", detail: "Verify the exact 180 / 10 / 6 / 4 distribution." },
  { number: 21, phase: "Ownership", role: "BUYER_SELLER", title: "Verify final ownership", detail: "Confirm Buyer C owns one token and the listing cannot be reused." },
  { number: 22, phase: "Delivery", role: "BUYER_SELLER", title: "Transfer game access", detail: "Revoke Buyer B, exercise pending delivery, retry and activate Buyer C." },
] as const satisfies ReadonlyArray<{ number: number; phase: string; role: DemoRole; title: string; detail: string }>;

const roles = Object.keys(demoActors) as DemoRole[];

export function FullJourneyDashboard() {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [txState, setTxState] = useState<TransactionUiState>("IDLE");
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<DemoRole>("ARTIST");
  const [view, setView] = useState<"guided" | "automatic">("guided");
  const [evidenceQuery, setEvidenceQuery] = useState("");
  const [contractFilter, setContractFilter] = useState("ALL");

  const load = useCallback(async () => {
    const response = await fetch("/api/demo/journey", { cache: "no-store" });
    const payload = await response.json();
    if (payload.journey) setJourney(payload.journey);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function runJourney(targetStep?: number) {
    setError("");
    setTxState("AWAITING_SIGNATURE");
    await new Promise((resolve) => setTimeout(resolve, 220));
    setTxState("PENDING");
    try {
      const response = await fetch("/api/demo/journey", {
        method: "POST",
        headers: targetStep ? { "content-type": "application/json" } : undefined,
        body: targetStep ? JSON.stringify({ targetStep }) : undefined,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(`${payload.code}: ${payload.message}`);
      setJourney(payload.journey);
      setTxState("CONFIRMED");
      if (targetStep && targetStep < 22) setSelectedRole(workflow[targetStep].role);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Journey execution failed");
      setTxState("REVERTED");
    }
  }

  const completed = journey?.completedSteps ?? journey?.steps.length ?? 0;
  const rows = useMemo(() => (journey?.evidence ?? []).map((row) => ({ ...row, blockNumber: BigInt(row.blockNumber) })), [journey]);
  const contracts = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((row) => row.contractName))).sort()], [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    if (contractFilter !== "ALL" && row.contractName !== contractFilter) return false;
    if (!evidenceQuery.trim()) return true;
    const haystack = `${row.transactionHash} ${row.contractName} ${row.eventName} ${row.actor} ${row.designId ?? ""} ${row.tokenId ?? ""}`.toLowerCase();
    return haystack.includes(evidenceQuery.trim().toLowerCase());
  }), [rows, evidenceQuery, contractFilter]);
  const roleTasks = workflow.filter((step) => step.role === selectedRole);
  const nextStep = workflow[completed];
  const running = txState === "PENDING" || txState === "AWAITING_SIGNATURE";

  function downloadEvidence() {
    if (!journey) return;
    const blob = new Blob([JSON.stringify(journey, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `moba-evidence-${journey.completedSteps ?? journey.steps.length}-of-22.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="journey" id="journey">
      <div className="section-heading section-heading-row">
        <div><p className="eyebrow">LIVE PROTOTYPE</p><h2>Operate the full marketplace</h2>
          <p>Use Guided Role Mode for stakeholder-by-stakeholder transactions, or run the same verified logic automatically for regression and recording.</p></div>
        <div className="mode-switch" aria-label="Demo mode">
          <button className={view === "guided" ? "active" : "ghost"} onClick={() => setView("guided")}>Guided roles</button>
          <button className={view === "automatic" ? "active" : "ghost"} onClick={() => setView("automatic")}>Automatic 22-step</button>
        </div>
      </div>

      {view === "automatic" ? (
        <div className="runbar">
          <div><strong>Deterministic regression</strong><small>Fresh contracts · confirmed receipts · exact accounting</small></div>
          <button onClick={() => runJourney()} disabled={running}>Run clean 22-step journey</button>
          <span className={`status status-${txState.toLowerCase().replaceAll("_", "-")}`}>{txState}</span>
        </div>
      ) : (
        <div className="guided-shell">
          <article className="panel role-console">
            <div className="console-topline"><span className="live-dot" /> Guided role session <span>{completed}/22 confirmed</span></div>
            <div className="progress-track"><span style={{ width: `${(completed / 22) * 100}%` }} /></div>
            <label>Active stakeholder
              <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as DemoRole)}>
                {roles.map((role) => <option key={role}>{role}</option>)}
              </select>
            </label>
            <dl>
              <div><dt>Demo wallet</dt><dd className="mono">{demoActors[selectedRole]}</dd></div>
              <div><dt>Network</dt><dd>{journey ? `Hardhat ${journey.deployment.chainId}` : "Hardhat 31337"}</dd></div>
              <div><dt>Evidence rule</dt><dd>Confirmed receipts only</dd></div>
            </dl>
            <div className="console-actions">
              <button className="ghost" disabled={running} onClick={() => { setSelectedRole("ARTIST"); void runJourney(1); }}>Start / reset guided demo</button>
              {nextStep && <span className="next-hint">Next: <strong>{nextStep.role}</strong> · {nextStep.title}</span>}
            </div>
          </article>

          <div className="role-task-grid">
            {roleTasks.map((step) => {
              const result = journey?.steps.find((item) => item.number === step.number);
              const isNext = step.number === completed + 1;
              return <article className={`task-card ${result ? "complete" : isNext ? "ready" : "locked"}`} key={step.number}>
                <div className="task-head"><span className="step-number">{String(step.number).padStart(2, "0")}</span><span className="phase-tag">{step.phase}</span></div>
                <h3>{step.title}</h3><p>{step.detail}</p>
                {result ? <div className="receipt-chip"><span>CONFIRMED</span><code>{result.transactionHash ? `${result.transactionHash.slice(0, 12)}…${result.transactionHash.slice(-6)}` : "OFF-CHAIN RECORD"}</code></div> :
                  <button disabled={!isNext || running} onClick={() => runJourney(step.number)}>{isNext ? `Execute as ${selectedRole}` : `Waiting for step ${completed + 1}`}</button>}
              </article>;
            })}
          </div>
        </div>
      )}

      {(running || error || txState === "CONFIRMED") && <div className={error ? "feedback error" : "feedback"} role="status">
        {error || (running ? `${txState === "AWAITING_SIGNATURE" ? "Preparing authorised actor" : "Confirming transactions and refreshing evidence"}…` : `Checkpoint ${completed}/22 confirmed.`)}
      </div>}

      <div className="lifecycle-strip" aria-label="Marketplace lifecycle">
        {["Create", "Verify", "Vote", "Produce", "Auction", "Activate", "Resell"].map((label, index) => <div key={label}><span>{index + 1}</span>{label}</div>)}
      </div>

      {journey && <div className="final-state">
        <div><small>Current owner</small><strong className="mono">{journey.finalState.owner ?? "Not minted"}</strong></div>
        <div><small>Buyer B access</small><strong>{journey.finalState.buyerBGameAccess}</strong></div>
        <div><small>Buyer C access</small><strong>{journey.finalState.buyerCGameAccess}</strong></div>
        <div><small>Settlement</small><strong>{journey.accounting.resale ? "Primary + resale" : journey.accounting.primary ? "Primary complete" : "Pending"}</strong></div>
      </div>}

      <article className="panel accounting-panel">
        <div><span>Primary settlement</span><strong>120</strong><small>Artist</small><strong>15</strong><small>Publisher</small><strong>15</strong><small>Platform</small></div>
        <div><span>Authorised resale</span><strong>180</strong><small>Seller</small><strong>10</strong><small>Artist</small><strong>6</strong><small>Publisher</small><strong>4</strong><small>Platform</small></div>
      </article>

      <div className="section-heading evidence-heading" id="evidence"><p className="eyebrow">BLOCKCHAIN EVIDENCE</p><h2>Receipts, not promises</h2>
        <p>Every row is decoded from the latest executed local-chain receipt. Kat delivery remains clearly labelled as off-chain evidence linked to a confirmed entitlement event.</p></div>
      <div className="evidence-toolbar">
        <label>Search evidence<input value={evidenceQuery} onChange={(event) => setEvidenceQuery(event.target.value)} placeholder="Transaction, actor or event" /></label>
        <label>Contract<select value={contractFilter} onChange={(event) => setContractFilter(event.target.value)}>{contracts.map((contract) => <option key={contract}>{contract}</option>)}</select></label>
        <button className="ghost" onClick={downloadEvidence} disabled={!journey}>Download JSON</button>
        <span>{filteredRows.length} confirmed event{filteredRows.length === 1 ? "" : "s"}</span>
      </div>
      <BlockchainEvidenceTable rows={filteredRows} />

      <article className="panel boundary-panel">
        <div><span className="boundary-mark chain">ON</span><h3>Blockchain authority</h3><p>Approvals, votes, escrow, settlement, entitlement ownership, transfer and royalty allocation.</p></div>
        <div><span className="boundary-mark off">OFF</span><h3>Private operations</h3><p>Files, detailed review, KYC, production assets and game-account activation remain off-chain.</p></div>
      </article>
    </section>
  );
}
