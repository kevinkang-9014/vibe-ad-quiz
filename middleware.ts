import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const paddedBase64 = base64 + (pad ? "====".substring(pad) : "");
    const decoded = Buffer.from(paddedBase64, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  let token: string | null = null;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    token =
      request.headers.get("x-qanda-token") ||
      request.headers.get("x-auth-token") ||
      request.headers.get("x-access-token");
  }

  if (!token) {
    const accessToken = request.cookies.get("access_token");
    if (accessToken) return NextResponse.next();
  }

  if (token) {
    const decoded = decodeJWT(token);
    if (decoded) {
      const response = NextResponse.next();
      const exp = decoded.exp as number | undefined;
      const maxAge = exp ? exp - Math.floor(Date.now() / 1000) : undefined;

      response.cookies.set("access_token", token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge,
      });
      response.cookies.set("qanda_user_id", (decoded.sub as string) || "", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
