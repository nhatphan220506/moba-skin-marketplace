"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  type KatApiError,
} from "@/lib/blockchain/katEventAdapter";
import type { ActivationRecord } from "@/types/activation";
import type { VerificationReport } from "@/types/verification";

const buyerB = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f" as const;
const buyerC = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720" as const;
const verifier = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const;
const reviewer = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" as const;

type Result = Record<string, unknown>;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const payload = (await response.json()) as T | KatApiError;
  if (!response.ok) {
    const error = payload as KatApiError;
    throw new Error(`${error.code}: ${error.message}${error.recoverable ? " (recoverable)" : ""}`);
  }
  return payload as T;
}

function jsonPost<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function Status({ value }: { value?: string }) {
  if (!value) return null;
  return <span className={`status status-${value.toLowerCase().replaceAll("_", "-")}`}>{value}</span>;
}

export function KatIntegrationDashboard() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [uploaded, setUploaded] = useState<Result | null>(null);
  const [preScreen, setPreScreen] = useState<VerificationReport | null>(null);
  const [productionVersion, setProductionVersion] = useState("");
  const [buyerBStatus, setBuyerBStatus] = useState<ActivationRecord | null>(null);
  const [buyerCStatus, setBuyerCStatus] = useState<ActivationRecord | null>(null);

  useEffect(() => {
    void Promise.all([
      api<ActivationRecord>(`/api/game/status/${buyerB}/1`),
      api<ActivationRecord>(`/api/game/status/${buyerC}/1`),
    ]).then(([b, c]) => { setBuyerBStatus(b); setBuyerCStatus(c); }).catch(() => undefined);
  }, []);

  async function run<T extends Result>(label: string, action: () => Promise<T>, after?: (value: T) => void) {
    setBusy(label);
    setError("");
    try {
      const value = await action();
      setResult(value);
      after?.(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected integration error");
    } finally {
      setBusy("");
    }
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run<Result>("Uploading", () => api("/api/files/upload", { method: "POST", body: data }), setUploaded);
  }

  function screen() {
    void run<VerificationReport & Result>("Screening", () => jsonPost("/api/verification/pre-screen", {
      designId: 1,
      aiUsed: true,
      disclosureComplete: true,
      evidenceFileIds: uploaded ? [String(uploaded.fileId), "creation-evidence-0001"] : ["concept-design-0001", "creation-evidence-0001"],
    }), setPreScreen);
  }

  function humanReview() {
    if (!preScreen) {
      setError("Run automated pre-screen before recording human review.");
      return;
    }
    const { reportId: _reportId, decision: _decision, verifierAddress: _verifierAddress, reportHash: _reportHash, reviewedAt: _reviewedAt, ...automatedSummary } = preScreen;
    void run("Recording review", () => jsonPost<Result>("/api/verification/reports", {
      designId: 1,
      automatedSummary,
      decision: "APPROVED",
      verifierAddress: verifier,
      notes: "Local Kat integration smoke review",
    }));
  }

  function createProduction() {
    void run("Creating production record", () => jsonPost<Result>("/api/production/records", {
      designId: 1,
      productionStudio: "Authorised Demo Studio",
      modelFileURI: "/mock-production/design-1-ui.glb",
      approvedGame: "Demo MOBA",
    }), (value) => setProductionVersion(String(value.version)));
  }

  function reviewProduction() {
    if (!productionVersion) {
      setError("Create a production version before QA review.");
      return;
    }
    void run("Recording QA", () => jsonPost<Result>("/api/production/review", {
      designId: 1,
      version: productionVersion,
      qaStatus: "APPROVED",
      reviewerAddress: reviewer,
      notes: "Local compatibility smoke review",
    }));
  }

  function linkSeededAccounts() {
    void run("Resolving accounts", async () => {
      const [b, c] = await Promise.all([
        jsonPost<Result>("/api/accounts/link", { walletAddress: buyerB, gameAccountId: "moba-player-b" }),
        jsonPost<Result>("/api/accounts/link", { walletAddress: buyerC, gameAccountId: "moba-player-c-pending-once" }),
      ]);
      return { buyerB: b, buyerC: c };
    });
  }

  function loadAccessStatus() {
    void run("Loading access status", async () => {
      const [b, c] = await Promise.all([
        api<ActivationRecord>(`/api/game/status/${buyerB}/1`),
        api<ActivationRecord>(`/api/game/status/${buyerC}/1`),
      ]);
      setBuyerBStatus(b); setBuyerCStatus(c);
      return { buyerB: b, buyerC: c };
    });
  }

  return (
    <section className="integration" aria-labelledby="integration-heading">
      <div className="section-heading">
        <p className="eyebrow">KAT OFF-CHAIN INTEGRATION</p>
        <h2 id="integration-heading">Local functional console</h2>
        <p>Every action below calls Kat&apos;s real local API. Entitlement delivery is sourced only from the confirmed receipt journey above.</p>
      </div>

      {(busy || error) && <div className={error ? "feedback error" : "feedback"} role="status">{error || `${busy}…`}</div>}

      <div className="workflow-grid">
        <article className="panel workflow-card">
          <span className="step">01</span><h3>Artist submission</h3>
          <form onSubmit={upload}>
            <input type="hidden" name="category" value="concept-design" />
            <input type="hidden" name="designId" value="1" />
            <label>Concept file<input required name="file" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.json,.glb,.gltf,.fbx,.blend,.obj" /></label>
            <button disabled={Boolean(busy)} type="submit">Upload and hash</button>
          </form>
          {uploaded && <p className="compact"><strong>URI</strong> {String(uploaded.storageURI)}<br /><strong>SHA-256</strong> {String(uploaded.sha256)}</p>}
        </article>

        <article className="panel workflow-card">
          <span className="step">02</span><h3>Verification</h3>
          <div className="actions"><button disabled={Boolean(busy)} onClick={screen}>Run pre-screen</button><button disabled={Boolean(busy) || !preScreen} onClick={humanReview}>Approve human review</button></div>
          {preScreen && <p className="compact"><Status value={preScreen.overallRisk} /> Similarity {preScreen.similarityRisk} · Trademark {preScreen.trademarkRisk}</p>}
        </article>

        <article className="panel workflow-card">
          <span className="step">03</span><h3>Production &amp; QA</h3>
          <div className="actions"><button disabled={Boolean(busy)} onClick={createProduction}>Create next version</button><button disabled={Boolean(busy) || !productionVersion} onClick={reviewProduction}>Approve QA</button><button disabled={Boolean(busy)} onClick={() => void run("Loading history", () => api<Result>("/api/production/1"))}>View history</button></div>
          {productionVersion && <p className="compact">Current UI-created version: <strong>{productionVersion}</strong></p>}
        </article>

        <article className="panel workflow-card">
          <span className="step">04</span><h3>Inventory &amp; delivery</h3>
          <p className="fixture">Activation and transfer are accepted only from the confirmed receipts produced by the 22-step journey above.</p>
          <div className="actions"><button disabled={Boolean(busy)} onClick={linkSeededAccounts}>Resolve accounts</button><button disabled={Boolean(busy)} onClick={loadAccessStatus}>Refresh access status</button></div>
          <div className="access-row"><span>Buyer B</span><Status value={buyerBStatus?.status ?? "NOT_SYNCED"} /></div>
          <div className="access-row"><span>Buyer C</span><Status value={buyerCStatus?.status ?? "NOT_SYNCED"} /></div>
        </article>
      </div>

      <details className="result"><summary>Latest API result</summary><pre>{result ? JSON.stringify(result, null, 2) : "Run an action to inspect its response."}</pre></details>
      <p className="authority-note">Game access mirrors validated entitlement evidence; it does not confer copyright or game-IP ownership.</p>
    </section>
  );
}
