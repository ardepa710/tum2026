import { auth } from "@/lib/auth";
import { Search, Bell } from "lucide-react";

export async function Header() {
  const session = await auth();

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search tenants, users..."
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Bell className="w-5 h-5" />
        </button>

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
