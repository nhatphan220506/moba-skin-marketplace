"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BlockchainEvidenceTable } from "@/components/technical/BlockchainEvidenceTable";
import type { EvidenceRow, TransactionUiState } from "@/types/evidence";

type JourneyStep = {
  number: number; actor: string; role: string; action: string; service: string;
  transactionHash?: `0x${string}`; blockNumber?: number; stateBefore?: string; stateAfter?: string;
  classification: string; result: string; amount?: string; offchainEvidence?: Record<string, unknown>;
};
type Journey = {
  result: string; steps: JourneyStep[]; evidence: Array<Omit<EvidenceRow, "blockNumber"> & { blockNumber: string | number }>;
  deployment: { chainId: number; contracts: Record<string, string> };
  accounting: Record<string, unknown>;
  additionalChecks?: { adminRisk?: { result: string; actions: string[]; evidencePreserved: boolean; entitlementBalancePreserved: boolean } };
  finalOwner?: string;
  finalState: { buyerB?: string; buyerC?: string; buyerBGameAccess: string; buyerCGameAccess: string };
};

const sections = [
  ["Artist submission", [1]], ["Verification", [2]], ["Publisher review", [3, 8]], ["Voting", [4, 5, 6, 7]],
  ["Production & QA", [9, 10]], ["Primary auction", [11, 12, 13, 14, 15, 16]],
  ["Inventory & game access", [17, 21, 22]], ["Secondary market", [18, 19, 20]],
] as const;

export function FullJourneyDashboard() {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [txState, setTxState] = useState<TransactionUiState>("IDLE");
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState("ADMIN");

  const load = useCallback(async () => {
    const response = await fetch("/api/demo/journey", { cache: "no-store" });
    const payload = await response.json();
    if (payload.journey) setJourney(payload.journey);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function runJourney() {
    setError(""); setTxState("AWAITING_SIGNATURE");
    await new Promise((resolve) => setTimeout(resolve, 250));
    setTxState("PENDING");
    try {
      const response = await fetch("/api/demo/journey", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(`${payload.code}: ${payload.message}`);
      setJourney(payload.journey); setTxState("CONFIRMED");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Journey execution failed"); setTxState("REVERTED");
    }
  }

  const rows = useMemo(() => (journey?.evidence ?? []).map((row) => ({ ...row, blockNumber: BigInt(row.blockNumber) })), [journey]);
  const actor = journey?.steps.find((step) => step.role === selectedRole)?.actor;

  return (
    <section className="journey" id="journey">
      <div className="section-heading"><p className="eyebrow">FULL SYSTEM JOURNEY</p><h2>22-step deterministic demo</h2>
        <p>One action deploys fresh local contracts, executes every authorised transaction, syncs Kat only after confirmed receipts, checks accounting, and refreshes evidence.</p></div>
      <div className="runbar">
        <button onClick={runJourney} disabled={txState === "PENDING" || txState === "AWAITING_SIGNATURE"}>Run clean 22-step journey</button>
        <span className={`status status-${txState.toLowerCase().replaceAll("_", "-")}`}>{txState}</span>
        <span>{journey ? `${journey.steps.filter((step) => step.result === "PASS").length}/22 passed` : "No completed run loaded"}</span>
      </div>
      {error && <div className="feedback error" role="alert">{error}</div>}

      <article className="panel role-panel"><h3>Role &amp; wallet</h3>
        <label>Demo role<select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
          {["ADMIN", "ARTIST", "VERIFIER", "PUBLISHER", "GAME_DEVELOPER", "FAN", "BUYER_SELLER"].map((role) => <option key={role}>{role}</option>)}
        </select></label>
        <dl><div><dt>Address</dt><dd className="mono">{actor ?? "Run journey to resolve"}</dd></div>
          <div><dt>Network</dt><dd>{journey ? `Hardhat ${journey.deployment.chainId}` : "Local chain"}</dd></div>
          <div><dt>Permission</dt><dd>{actor ? "Mapped demo actor" : "Not resolved"}</dd></div></dl>
      </article>

      <div className="screen-grid">{sections.map(([title, numbers]) => {
        const relevant = journey?.steps.filter((step) => (numbers as readonly number[]).includes(step.number)) ?? [];
        return <article className="panel screen-card" key={title}><h3>{title}</h3>
          {relevant.length === 0 ? <p className="muted">Waiting for a verified run.</p> : relevant.map((step) =>
            <div className="step-result" key={step.number}><span className="step-number">{step.number}</span><div><strong>{step.action}</strong>
              <small>{step.stateBefore} → {step.stateAfter}</small><small>{step.classification.replaceAll("_", " ")} · {step.result}</small></div></div>)}
        </article>;
      })}</div>

      <article className="panel risk-card"><h3>Admin risk</h3>
        {journey?.additionalChecks?.adminRisk ? <>
          <p><StatusLine label="Design control" value="Suspend → reinstate" /></p>
          <p><StatusLine label="System control" value="Pause → unpause" /></p>
          <p className="muted">Evidence and Buyer C&apos;s entitlement balance remained intact · {journey.additionalChecks.adminRisk.result}</p>
        </> : <p className="muted">Run the journey to verify suspension, reinstatement, pause and unpause.</p>}
      </article>

      {journey && <div className="final-state">
        <div><small>Final owner</small><strong className="mono">{journey.steps.find((step) => step.number === 21)?.actor}</strong></div>
        <div><small>Buyer B access</small><strong>{journey.finalState.buyerBGameAccess}</strong></div>
        <div><small>Buyer C access</small><strong>{journey.finalState.buyerCGameAccess}</strong></div>
        <div><small>Accounting</small><strong>150 primary · 200 resale</strong></div>
      </div>}

      <div className="section-heading evidence-heading"><p className="eyebrow">BLOCKCHAIN EVIDENCE</p><h2>Confirmed receipt history</h2>
        <p>Rows below come from the latest executed local-chain receipts. Kat activation records are shown inside linked off-chain steps and are not ownership proof.</p></div>
      <BlockchainEvidenceTable rows={rows} />
    </section>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return <><strong>{label}</strong><small className="risk-value">{value}</small></>;
}
