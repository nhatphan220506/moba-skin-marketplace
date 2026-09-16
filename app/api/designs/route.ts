import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import { createDesignSubmission, listDesignLifecycles } from "@/lib/server/designService";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner")?.toLowerCase();
  const stage = url.searchParams.get("stage")?.toUpperCase();
  const records = await listDesignLifecycles();
  return NextResponse.json({ designs: records.filter(record => (!owner || record.creatorWallet === owner) && (!stage || record.stage === stage)) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => { throw validationError("request body must be JSON"); });
    return NextResponse.json(await createDesignSubmission(body), { status: 201 });
  } catch (error) { return routeError(error); }
}
