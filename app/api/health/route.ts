import { NextResponse } from "next/server";

import { postgresEnabled } from "@/lib/server/postgres";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "moba-forge-product", chainId: 11155111, storage: process.env.IPFS_PINNING_URL ? "ipfs" : "local", database: postgresEnabled() ? "postgresql" : "local-json", indexer: "enabled-by-npm-start" }, { headers: { "cache-control": "no-store" } });
}
