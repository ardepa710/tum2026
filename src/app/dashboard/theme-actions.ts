"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

export async function updateTheme(theme: string) {
  if (theme !== "dark" && theme !== "light") return;

  const session = await auth();
  if (!session?.user?.email) return;

  // Try to update DB — user may not exist if JWT-only session
  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { theme },
    });
  } catch {
    // User not in DB — that's OK, just save in cookie
  }

  // Set cookie for SSR (always works)
  const cookieStore = await cookies();
  cookieStore.set("theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  logAudit({ actor: session.user.email, action: "UPDATE", entity: "THEME", details: { theme } });
}
