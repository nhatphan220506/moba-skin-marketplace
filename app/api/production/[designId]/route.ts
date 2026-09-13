import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import { getProductionRecords } from "@/lib/server/productionService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ designId: string }> },
) {
  try {
    const { designId } = await context.params;
    const parsed = Number(designId);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw validationError("designId must be a positive integer");
    }
    return NextResponse.json(await getProductionRecords(parsed));
  } catch (error) {
    return routeError(error);
  }
}
