import type {
  RiskLevel,
  VerificationDecision,
  VerificationFinding,
  VerificationReport,
} from "@/types/verification";

import { notFoundError, validationError } from "@/lib/server/api";
import { hashJson } from "@/lib/server/hashing";
import { readCollection, updateCollection } from "@/lib/server/storage";

const BASE_TIMESTAMP = 1788948100;

export type PreScreenInput = {
  designId: number;
  aiUsed: boolean;
  disclosureComplete: boolean;
  evidenceFileIds: string[];
};

export type StoredVerificationReport = VerificationReport & {
  notes?: string;
};

export type CreateVerificationReportInput = {
  designId: number;
  automatedSummary: Omit<
    VerificationReport,
    "reportId" | "decision" | "verifierAddress" | "reportHash" | "reviewedAt"
  >;
  decision: VerificationDecision;
  verifierAddress: `0x${string}`;
  notes?: string;
};

function requireDesignId(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw validationError("designId must be a positive integer");
  }
}

function validateAddress(value: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw validationError("verifierAddress must be a 20-byte hexadecimal address");
  }
}

function riskLevel(score: number): RiskLevel {
  if (score <= 29) return "LOW";
  if (score <= 59) return "MEDIUM";
  return "HIGH";
}

export async function preScreen(input: PreScreenInput): Promise<VerificationReport> {
  requireDesignId(input.designId);
  if (typeof input.aiUsed !== "boolean" || typeof input.disclosureComplete !== "boolean") {
    throw validationError("aiUsed and disclosureComplete must be booleans");
  }
  if (
    !Array.isArray(input.evidenceFileIds) ||
    input.evidenceFileIds.some((id) => typeof id !== "string" || !id)
  ) {
    throw validationError("evidenceFileIds must be an array of non-empty strings");
  }

  const evidenceCount = input.evidenceFileIds.length;
  const similarityRisk = evidenceCount >= 2 ? 22 : evidenceCount === 1 ? 45 : 75;
  const trademarkRisk = evidenceCount >= 2 ? 8 : evidenceCount === 1 ? 35 : 70;
  const riskFloor = !input.disclosureComplete ? 70 : evidenceCount === 0 ? 75 : 0;
  const overallRisk = riskLevel(Math.max(similarityRisk, trademarkRisk, riskFloor));
  const findings: VerificationFinding[] = [];

  if (!input.disclosureComplete) {
    findings.push({
      code: "AI_DISCLOSURE_INCOMPLETE",
      severity: "HIGH",
      summary: "AI-use disclosure is incomplete and requires revision before human review.",
    });
  }
  if (evidenceCount === 0) {
    findings.push({
      code: "EVIDENCE_MISSING",
      severity: "HIGH",
      summary: "No creation or provenance evidence was supplied.",
    });
  } else if (evidenceCount === 1) {
    findings.push({
      code: "EVIDENCE_LIMITED",
      severity: "MEDIUM",
      summary: "Only one supporting evidence file was supplied.",
    });
  }

  const report: VerificationReport = {
    reportId: `verification-design-${input.designId}-prescreen`,
    designId: input.designId,
    aiUsed: input.aiUsed,
    disclosureComplete: input.disclosureComplete,
    similarityRisk,
    trademarkRisk,
    overallRisk,
    recommendedAction: overallRisk === "HIGH" ? "REVISE" : "HUMAN_REVIEW",
    findings,
  };

  await updateCollection<StoredVerificationReport[]>("verificationReports", [], (reports) => [
    ...reports.filter((candidate) => candidate.reportId !== report.reportId),
    report,
  ]);
  return report;
}

export async function createVerificationReport(
  input: CreateVerificationReportInput,
): Promise<StoredVerificationReport> {
  requireDesignId(input.designId);
  validateAddress(input.verifierAddress);
  if (!["APPROVED", "REJECTED", "REVISION_REQUIRED"].includes(input.decision)) {
    throw validationError("decision is invalid");
  }
  if (input.automatedSummary?.designId !== input.designId) {
    throw validationError("automatedSummary.designId must match designId");
  }

  const reports = await readCollection<StoredVerificationReport[]>("verificationReports", []);
  const preScreenReport = reports.find(
    (candidate) => candidate.reportId === `verification-design-${input.designId}-prescreen`,
  );
  if (!preScreenReport) {
    throw validationError("a stored pre-screen is required before human review");
  }

  const comparable = {
    designId: preScreenReport.designId,
    aiUsed: preScreenReport.aiUsed,
    disclosureComplete: preScreenReport.disclosureComplete,
    similarityRisk: preScreenReport.similarityRisk,
    trademarkRisk: preScreenReport.trademarkRisk,
    overallRisk: preScreenReport.overallRisk,
    recommendedAction: preScreenReport.recommendedAction,
    findings: preScreenReport.findings,
  };
  if (hashJson(comparable) !== hashJson(input.automatedSummary)) {
    throw validationError("automatedSummary does not match the stored pre-screen");
  }

  const version = reports.filter(
    (candidate) => candidate.designId === input.designId && candidate.decision,
  ).length + 1;
  const reviewedAt = BASE_TIMESTAMP + version;
  const withoutHash: StoredVerificationReport = {
    reportId: `verification-design-${input.designId}-v${version}`,
    ...comparable,
    decision: input.decision,
    verifierAddress: input.verifierAddress,
    reviewedAt,
    ...(input.notes ? { notes: input.notes } : {}),
  };
  const report = { ...withoutHash, reportHash: hashJson(withoutHash) };
  await updateCollection<StoredVerificationReport[]>("verificationReports", [], (current) => [
    ...current,
    report,
  ]);
  return report;
}

export async function getVerificationReport(
  designId: number,
): Promise<StoredVerificationReport> {
  requireDesignId(designId);
  const reports = await readCollection<StoredVerificationReport[]>("verificationReports", []);
  const report = [...reports].reverse().find((candidate) => candidate.designId === designId);
  if (!report) {
    throw notFoundError(`Verification report for design ${designId} was not found`);
  }
  return report;
}
