/**
 * Auth.js v5 edge-safe middleware.
 *
 * Uses NextAuth(authConfig).auth to:
 *   1. Cryptographically validate the JWT (AUTH_SECRET) — replaces the old
 *      cookie-name-only check that could be bypassed with a forged cookie name.
 *   2. Enforce role-based page access for known admin-only paths (canAccessPage).
 *
 * Auth.js v5 handles chunked cookies (.0 / .1 suffixes for large Microsoft JWTs)
 * automatically, so no custom cookie parsing is needed here.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { canAccessPage, type Role } from "@/lib/rbac-shared";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // No valid session → redirect to login
  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce role-based page restrictions (e.g. /dashboard/permissions → ADMIN only)
  const role = ((req.auth.user as Record<string, unknown>).role as Role) ?? "VIEWER";
  if (!canAccessPage(role, req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
