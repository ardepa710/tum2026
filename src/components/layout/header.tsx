import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { MobileMenuButton } from "@/components/layout/mobile-menu-button";

export async function Header({ role }: { role?: string }) {
  const session = await auth();
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value || "dark";

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div className="hidden sm:block">
          <GlobalSearch role={role} />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <ThemeToggle initialTheme={theme} />

        <NotificationBell />

        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-sm font-medium text-white">
              {session.user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="text-sm">
              <p className="font-medium text-[var(--text-primary)]">
                {session.user.name || "User"}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {session.user.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
