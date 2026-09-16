import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import { createWalletSession } from "@/lib/server/walletAuth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => { throw validationError("request body must be JSON"); });
    return NextResponse.json(await createWalletSession(body));
  } catch (error) { return routeError(error); }
}
