import { NextResponse } from "next/server";

import {
  revokeEntitlement,
  type LegacyRevokeInput,
  type RevokeInput,
} from "@/lib/mock-game/activationService";
import { routeError, validationError } from "@/lib/server/api";
import { requireGameService } from "@/lib/server/walletAuth";

export async function POST(request: Request) {
  try {
    requireGameService(request);
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as RevokeInput | LegacyRevokeInput;
    return NextResponse.json(await revokeEntitlement(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
