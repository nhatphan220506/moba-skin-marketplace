import { NextResponse } from "next/server";
import journey from "@/docs/integration/evidence/full-journey.json";
import { getIndexedEvidence } from "@/lib/server/indexedEvidence";

export const dynamic = "force-dynamic";
export async function GET() {
  const indexed = await getIndexedEvidence();
  const headers = { "Cache-Control": "no-store, max-age=0" };
  if (indexed.length) return NextResponse.json({ source: "sepolia-indexer", chainId: 11155111, evidence: indexed.map((row) => ({ ...row, blockNumber: row.blockNumber.toString() })) }, { headers });
  return NextResponse.json({ source: "executed-local-receipts", publicDeployment: false, journey }, { headers });
}
