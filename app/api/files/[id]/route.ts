import { NextResponse } from "next/server";

import { routeError } from "@/lib/server/api";
import { getFileRecord } from "@/lib/server/fileService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getFileRecord(id));
  } catch (error) {
    return routeError(error);
  }
}
