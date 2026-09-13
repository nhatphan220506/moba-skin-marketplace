import { NextResponse } from "next/server";
import journey from "@/docs/integration/evidence/full-journey.json";
import { getIndexedEvidence } from "@/lib/server/indexedEvidence";

export const dynamic = "force-dynamic";
export async function GET() {
  const indexed = await getIndexedEvidence();
  if (indexed.length) return NextResponse.json({ source: "sepolia-indexer", chainId: 11155111, evidence: indexed.map((row) => ({ ...row, blockNumber: row.blockNumber.toString() })) });
  return NextResponse.json({ source: "executed-local-receipts", publicDeployment: false, journey });
}
