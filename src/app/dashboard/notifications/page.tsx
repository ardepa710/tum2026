import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Bell, Clock, Mail, MailOpen, Trash2, CheckCheck } from "lucide-react";
import { NotificationActions } from "./notification-actions";

const PAGE_SIZE = 25;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const filterStatus = params.status || ""; // "read" | "unread" | ""

  const where: Record<string, unknown> = { userId: session.user.id };
  if (filterStatus === "read") where.isRead = true;
  if (filterStatus === "unread") where.isRead = false;

  const [notifications, totalCount, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return `/dashboard/notifications${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Notifications
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {totalCount} notification{totalCount !== 1 ? "s" : ""}
            {unreadCount > 0 && (
              <span className="text-[var(--accent)] ml-1">
                ({unreadCount} unread)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && <NotificationActions type="markAllRead" />}
          <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { label: "All", value: "" },
          { label: "Unread", value: "unread" },
          { label: "Read", value: "read" },
        ].map((tab) => (
          <a
            key={tab.value}
            href={buildUrl({ status: tab.value, page: "" })}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === tab.value
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Table */}
      {notifications.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No notifications
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            {filterStatus === "unread"
              ? "You're all caught up! No unread notifications."
              : "Notifications from task runs, technician syncs, and other system events will appear here."}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-8">
                    <Mail className="w-3.5 h-3.5" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider max-w-[300px]">
                    Body
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Created
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {notifications.map((n) => (
                  <tr
                    key={n.id}
                    className={`hover:bg-[var(--bg-hover)] transition-colors ${
                      !n.isRead ? "bg-[var(--accent)]/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {n.isRead ? (
                        <MailOpen className="w-4 h-4 text-[var(--text-muted)]" />
                      ) : (
                        <Mail className="w-4 h-4 text-[var(--accent)]" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                        )}
                        {n.link ? (
                          <a
                            href={n.link}
                            className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)] font-medium transition-colors"
                          >
                            {n.title}
                          </a>
                        ) : (
                          <span
                            className={`text-sm ${
                              n.isRead
                                ? "text-[var(--text-secondary)]"
                                : "text-[var(--text-primary)] font-medium"
                            }`}
                          >
                            {n.title}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[300px] truncate">
                      {n.body || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {n.createdAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!n.isRead && (
                          <NotificationActions type="markRead" id={n.id} />
                        )}
                        <NotificationActions type="delete" id={n.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={buildUrl({ page: String(page - 1) })}
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-lg hover:text-[var(--text-primary)] transition-colors"
                  >
                    Previous
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={buildUrl({ page: String(page + 1) })}
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
