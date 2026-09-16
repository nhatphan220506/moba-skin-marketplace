import { NextResponse } from "next/server";

import { postgresEnabled, postgresPool } from "@/lib/server/postgres";

export async function GET() {
  const storage = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase-private" : process.env.IPFS_PINNING_URL ? "ipfs" : "local";
  try {
    if (postgresEnabled()) await postgresPool().query("SELECT 1");
    return NextResponse.json({ status: "ok", service: "moba-forge-product", chainId: 11155111, storage, database: postgresEnabled() ? "postgresql" : "local-json", authentication: "wallet-session", indexer: "enabled-by-npm-start" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded", service: "moba-forge-product", chainId: 11155111, storage, database: "unreachable", authentication: "wallet-session", indexer: "waiting-for-database" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
