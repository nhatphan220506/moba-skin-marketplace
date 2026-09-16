import { NextResponse } from "next/server";

import { getAccountLink } from "@/lib/mock-game/accountLinkService";
import { routeError } from "@/lib/server/api";
import { readWalletSession, requireSessionAddress } from "@/lib/server/walletAuth";

export async function GET(
  request: Request,
  context: { params: Promise<{ wallet: string }> },
) {
  try {
    const session = readWalletSession(request)!;
    const { wallet } = await context.params;
    requireSessionAddress(session, wallet, "wallet");
    return NextResponse.json(await getAccountLink(wallet));
  } catch (error) {
    return routeError(error);
  }
}
