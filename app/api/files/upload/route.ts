import { NextResponse } from "next/server";

import { routeError, validationError } from "@/lib/server/api";
import { storeFile } from "@/lib/server/fileService";
import { requireWalletRole } from "@/lib/server/walletAuth";

export async function POST(request: Request) {
  try {
    await requireWalletRole(request, ["ARTIST"]);
    if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      throw validationError("content-type must be multipart/form-data");
    }
    const form = await request.formData().catch(() => {
      throw validationError("request body must be valid multipart form data");
    });
    return NextResponse.json(await storeFile(form), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
