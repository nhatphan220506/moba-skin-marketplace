import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import {
  createProductionRecord,
  type CreateProductionInput,
} from "@/lib/server/productionService";

export async function POST(request: Request) {
  try {
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as CreateProductionInput;
    return NextResponse.json(await createProductionRecord(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
