import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { postgresEnabled, postgresPool } from "@/lib/server/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  if (postgresEnabled()) {
    try {
      const result = await postgresPool().query("SELECT last_finalized_block, updated_at FROM indexer_cursors WHERE chain_id = $1", [11155111]);
      return NextResponse.json({ configured: true, storage: "postgresql", chainId: 11155111, cursor: result.rows[0] ?? null });
    } catch (error) {
      return NextResponse.json({ configured: true, storage: "postgresql", healthy: false, error: error instanceof Error ? error.message : "Database error" }, { status: 503 });
    }
  }
  try {
    const stored = JSON.parse(await readFile(path.join(process.cwd(), "data", "indexed-events.json"), "utf8"));
    return NextResponse.json({ configured: true, storage: "local-fallback", chainId: 11155111, cursor: stored.cursor, eventCount: stored.events?.length ?? 0 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return NextResponse.json({ configured: false, storage: "local-fallback", message: "No public deployment has been indexed yet." });
    throw error;
  }
}
