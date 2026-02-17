import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TUM 2026 - IT Admin Dashboard",
  description: "Multi-tenant IT administration dashboard for Microsoft 365 and Active Directory management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
