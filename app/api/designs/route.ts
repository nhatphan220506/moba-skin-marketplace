import { NextResponse } from "next/server";

import { authenticationError, routeError, validationError } from "@/lib/server/api";
import { createDesignSubmission, listDesignLifecycles } from "@/lib/server/designService";
import { readWalletSession, requireSessionAddress, requireWalletRole } from "@/lib/server/walletAuth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner")?.toLowerCase();
  const stage = url.searchParams.get("stage")?.toUpperCase();
  const records = await listDesignLifecycles();
  const session = readWalletSession(request, true);
  if (owner) {
    if (!session) return routeError(authenticationError());
    requireSessionAddress(session, owner, "owner");
  } else if (session) {
    await requireWalletRole(request, ["VERIFIER", "PUBLISHER", "GAME_TEAM", "ADMIN"]);
  }
  const visible = session ? records : records.filter(record => record.public);
  return NextResponse.json({ designs: visible.filter(record => (!owner || record.creatorWallet === owner) && (!stage || record.stage === stage)) });
}

export async function POST(request: Request) {
  try {
    const session = await requireWalletRole(request, ["ARTIST"]);
    const body = await request.json().catch(() => { throw validationError("request body must be JSON"); });
    requireSessionAddress(session, body.creatorWallet, "creatorWallet");
    return NextResponse.json(await createDesignSubmission(body), { status: 201 });
  } catch (error) { return routeError(error); }
}
