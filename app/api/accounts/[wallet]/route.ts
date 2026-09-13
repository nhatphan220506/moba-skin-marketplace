import { NextResponse } from "next/server";

import { getAccountLink } from "@/lib/mock-game/accountLinkService";
import { routeError } from "@/lib/server/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ wallet: string }> },
) {
  try {
    const { wallet } = await context.params;
    return NextResponse.json(await getAccountLink(wallet));
  } catch (error) {
    return routeError(error);
  }
}
