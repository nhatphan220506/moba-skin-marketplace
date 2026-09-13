import { NextResponse } from "next/server";

import { getActivationStatus } from "@/lib/mock-game/activationService";
import { routeError, validationError } from "@/lib/server/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ wallet: string; designId: string }> },
) {
  try {
    const { wallet, designId } = await context.params;
    const parsed = Number(designId);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw validationError("designId must be a positive integer");
    }
    return NextResponse.json(await getActivationStatus(wallet, parsed));
  } catch (error) {
    return routeError(error);
  }
}
