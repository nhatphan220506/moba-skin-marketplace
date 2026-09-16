import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import { syncConfirmedTransaction } from "@/lib/server/transactionSync";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => { throw validationError("request body must be JSON"); });
    return NextResponse.json(await syncConfirmedTransaction(String(body.transactionHash ?? ""), Number(body.chainId)));
  } catch (error) { return routeError(error); }
}
