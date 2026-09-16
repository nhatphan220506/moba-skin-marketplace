import { NextResponse } from "next/server";

import { routeError } from "@/lib/server/api";
import { getFileRecord } from "@/lib/server/fileService";
import { requireWalletRole } from "@/lib/server/walletAuth";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireWalletRole(request, ["ARTIST", "VERIFIER", "PUBLISHER", "GAME_TEAM", "ADMIN"]);
    const { id } = await context.params;
    return NextResponse.json(await getFileRecord(id));
  } catch (error) {
    return routeError(error);
  }
}
