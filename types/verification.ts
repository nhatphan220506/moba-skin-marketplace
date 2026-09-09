export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type VerificationDecision = "APPROVED" | "REJECTED" | "REVISION_REQUIRED";

export interface VerificationFinding {
  code: string;
  severity: RiskLevel;
  summary: string;
  evidenceURI?: string;
}

export interface VerificationReport {
  reportId: string;
  designId: number;
  aiUsed: boolean;
  disclosureComplete: boolean;
  similarityRisk: number;
  trademarkRisk: number;
  overallRisk: RiskLevel;
  recommendedAction: "HUMAN_REVIEW" | "REVISE" | "REJECT";
  findings: VerificationFinding[];
  decision?: VerificationDecision;
  verifierAddress?: `0x${string}`;
  reportHash?: `0x${string}`;
  reviewedAt?: number;
}

// Risk screening assists a human reviewer. It does not prove copyright ownership.
