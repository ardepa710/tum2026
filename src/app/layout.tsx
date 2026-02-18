import type { Metadata } from "next";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "TUM 2026 - IT Admin Dashboard",
  description: "Multi-tenant IT administration dashboard for Microsoft 365 and Active Directory management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  let theme = cookieStore.get("theme")?.value;

  // If no cookie but user is logged in, read from DB
  if (!theme) {
    const session = await auth();
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { theme: true },
      });
      theme = user?.theme || "dark";
    } else {
      theme = "dark";
    }
  }

  return (
    <html lang="en" className={theme === "light" ? "light" : ""}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
