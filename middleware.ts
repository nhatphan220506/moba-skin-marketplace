import { NextResponse, type NextRequest } from "next/server";

function allowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000,https://nhatphan220506.github.io").split(",").map(value => value.trim());
  return allowed.includes(origin) ? origin : null;
}

export function middleware(request: NextRequest) {
  const origin = allowedOrigin(request);
  if (request.method === "OPTIONS") {
    if (!origin) return new NextResponse(null, { status: 403 });
    return new NextResponse(null, { status: 204, headers: { "access-control-allow-origin": origin, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "authorization,content-type", "access-control-max-age": "86400", vary: "Origin" } });
  }
  const response = NextResponse.next();
  if (origin) { response.headers.set("access-control-allow-origin", origin); response.headers.set("vary", "Origin"); }
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = { matcher: "/api/:path*" };
