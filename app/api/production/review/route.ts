import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import {
  reviewProductionRecord,
  type ReviewProductionInput,
} from "@/lib/server/productionService";

export async function POST(request: Request) {
  try {
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as ReviewProductionInput;
    return NextResponse.json(await reviewProductionRecord(input));
  } catch (error) {
    return routeError(error);
  }
}
