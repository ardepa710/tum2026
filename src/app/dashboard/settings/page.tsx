import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/rbac";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationPrefsForm } from "@/components/notification-prefs-form";
import { Settings, User, Palette, BellRing, Info, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await auth();
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value || "dark";
  const role = await getSessionRole();

  // Fetch or create default notification preferences
  let prefs = session?.user?.id
    ? await prisma.notificationPreference.findUnique({
        where: { userId: session.user.id },
      })
    : null;

  if (!prefs && session?.user?.id) {
    prefs = await prisma.notificationPreference.create({
      data: { userId: session.user.id },
    });
  }

  const notificationPrefs = {
    onTaskRun: prefs?.onTaskRun ?? true,
    onTaskFail: prefs?.onTaskFail ?? true,
    onTechSync: prefs?.onTechSync ?? true,
    onNewTenant: prefs?.onNewTenant ?? false,
  };

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userInitial = userName[0]?.toUpperCase() || "U";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Settings
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage your profile, appearance, and notification preferences
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Profile
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--accent)] flex items-center justify-center text-xl font-bold text-white">
              {userInitial}
            </div>
            <div>
              <p className="text-base font-medium text-[var(--text-primary)]">
                {userName}
              </p>
              <p className="text-sm text-[var(--text-muted)]">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Appearance
            </h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Theme
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Switch between dark and light mode
              </p>
            </div>
            <ThemeToggle initialTheme={theme} />
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BellRing className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Notification Preferences
            </h3>
          </div>
          <NotificationPrefsForm initialPrefs={notificationPrefs} />
        </div>

        {/* Custom Fields (Admin only) */}
        {role === "ADMIN" && (
          <Link
            href="/dashboard/settings/custom-fields"
            className="block bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--accent)] transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Custom Fields
              </h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Define custom fields for tenants and tasks
            </p>
          </Link>
        )}

        {/* About Section */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              About
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                Application
              </p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                TUM 2026
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]">Version</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
