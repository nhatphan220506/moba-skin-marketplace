import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import {
  reviewProductionRecord,
  type ReviewProductionInput,
} from "@/lib/server/productionService";
import { requireSessionAddress, requireWalletRole } from "@/lib/server/walletAuth";

export async function POST(request: Request) {
  try {
    const session = await requireWalletRole(request, ["GAME_TEAM"]);
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as ReviewProductionInput;
    requireSessionAddress(session, input.reviewerAddress, "reviewerAddress");
    return NextResponse.json(await reviewProductionRecord(input));
  } catch (error) {
    return routeError(error);
  }
}
