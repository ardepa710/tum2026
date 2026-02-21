import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasSessionCookie(request: NextRequest): boolean {
  // Auth.js v5 cookie names (plain + __Secure- prefix for HTTPS)
  // Also check chunked variants (.0, .1, ...) used when JWT is large
  const cookieNames = Array.from(request.cookies.getAll().map((c) => c.name));
  return cookieNames.some(
    (name) =>
      name === "authjs.session-token" ||
      name === "__Secure-authjs.session-token" ||
      name.startsWith("authjs.session-token.") ||
      name.startsWith("__Secure-authjs.session-token.")
  );
}

export function middleware(request: NextRequest) {
  if (!hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
