import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import {
  createVerificationReport,
  type CreateVerificationReportInput,
} from "@/lib/server/verificationService";

export async function POST(request: Request) {
  try {
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as CreateVerificationReportInput;
    return NextResponse.json(await createVerificationReport(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
