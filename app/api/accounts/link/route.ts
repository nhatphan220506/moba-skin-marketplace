import { NextResponse } from "next/server";

import { linkAccount, type LinkAccountInput } from "@/lib/mock-game/accountLinkService";
import { routeError, validationError } from "@/lib/server/api";

export async function POST(request: Request) {
  try {
    const input = (await request.json().catch(() => {
      throw validationError("request body must be valid JSON");
    })) as LinkAccountInput;
    return NextResponse.json(await linkAccount(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
