import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import { preScreen, type PreScreenInput } from "@/lib/server/verificationService";
import { requireWalletRole } from "@/lib/server/walletAuth";

export async function POST(request: Request) {
  try {
    await requireWalletRole(request, ["VERIFIER"]);
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as PreScreenInput;
    return NextResponse.json(await preScreen(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
