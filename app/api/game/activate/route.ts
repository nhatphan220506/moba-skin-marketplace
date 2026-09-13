import { NextResponse } from "next/server";

import {
  activateEntitlement,
  type ActivateInput,
  type LegacyActivateInput,
} from "@/lib/mock-game/activationService";
import { routeError, validationError } from "@/lib/server/api";

export async function POST(request: Request) {
  try {
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as ActivateInput | LegacyActivateInput;
    return NextResponse.json(await activateEntitlement(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
