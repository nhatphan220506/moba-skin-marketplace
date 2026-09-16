import { NextResponse } from "next/server";

import {
  retryActivation,
  type RetryInput,
} from "@/lib/mock-game/activationService";
import { routeError, validationError } from "@/lib/server/api";
import { requireGameService } from "@/lib/server/walletAuth";

export async function POST(request: Request) {
  try {
    requireGameService(request);
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as RetryInput;
    return NextResponse.json(await retryActivation(input));
  } catch (error) {
    return routeError(error);
  }
}
