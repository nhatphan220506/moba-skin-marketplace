import { NextResponse } from "next/server";

import { sha256 } from "@/lib/server/hashing";

type ApiError = {
  code: string;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
};

function errorResponse(message: string, details?: Record<string, unknown>) {
  const body: ApiError = {
    code: "VALIDATION_ERROR",
    message,
    recoverable: true,
    ...(details ? { details } : {}),
  };

  return NextResponse.json(body, { status: 400 });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return errorResponse("request body must be valid multipart form data");
    }
    const file = form.get("file");

    if (!(file instanceof File)) {
      return errorResponse("file is required");
    }

    return NextResponse.json({ sha256: sha256(await file.arrayBuffer()) });
  }

  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("request body must be valid JSON");
    }

    const content = (body as { content?: unknown } | null)?.content;
    if (typeof content !== "string") {
      return errorResponse("content is required and must be a string");
    }

    return NextResponse.json({ sha256: sha256(content) });
  }

  return errorResponse("provide multipart file or JSON content", {
    supportedContentTypes: ["multipart/form-data", "application/json"],
  });
}
