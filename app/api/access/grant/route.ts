import { NextResponse } from "next/server";

import { ServiceError, routeError, validationError } from "@/lib/server/api";
import { grantDiscoverAccess } from "@/lib/server/discoverAccess";
import { readWalletSession } from "@/lib/server/walletAuth";

const attempts = new Map<string, { count: number; resetAt: number }>();

function enforceRateLimit(address: string) {
  const now = Date.now();
  const current = attempts.get(address);
  if (!current || current.resetAt <= now) { attempts.set(address, { count: 1, resetAt: now + 10 * 60_000 }); return; }
  if (current.count >= 5) throw new ServiceError("TOO_MANY_ATTEMPTS", "Too many password attempts. Try again in 10 minutes.", 429, true);
  current.count += 1;
}

export async function POST(request: Request) {
  try {
    const session = readWalletSession(request)!;
    enforceRateLimit(session.address);
    const body = await request.json().catch(() => { throw validationError("request body must be JSON"); });
    const password = String(body.password || "");
    if (!password) throw validationError("Access password is required");
    const result = await grantDiscoverAccess(session.address, password);
    attempts.delete(session.address);
    return NextResponse.json(result);
  } catch (error) { return routeError(error); }
}
