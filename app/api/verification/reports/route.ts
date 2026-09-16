import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import {
  createVerificationReport,
  type CreateVerificationReportInput,
} from "@/lib/server/verificationService";
import { requireSessionAddress, requireWalletRole } from "@/lib/server/walletAuth";

export async function POST(request: Request) {
  try {
    const session = await requireWalletRole(request, ["VERIFIER"]);
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as CreateVerificationReportInput;
    requireSessionAddress(session, input.verifierAddress, "verifierAddress");
    return NextResponse.json(await createVerificationReport(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
