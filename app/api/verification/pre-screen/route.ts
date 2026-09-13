import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import { preScreen, type PreScreenInput } from "@/lib/server/verificationService";

export async function POST(request: Request) {
  try {
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as PreScreenInput;
    return NextResponse.json(await preScreen(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
