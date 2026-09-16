import { NextResponse } from "next/server";

import { routeError } from "@/lib/server/api";
import { createWalletChallenge } from "@/lib/server/walletAuth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json(await createWalletChallenge(url.searchParams.get("address") ?? "", url.origin));
  } catch (error) { return routeError(error); }
}
