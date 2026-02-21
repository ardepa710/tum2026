"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star,
  Building2,
  Cog,
  BookOpen,
  Wrench,
  User,
  UsersRound,
  Loader2,
} from "lucide-react";

type Bookmark = {
  id: number;
  entityType: string;
  entityId: string;
  label: string;
  metadata: string | null;
  createdAt: string;
};

const TYPE_ICONS: Record<string, typeof Building2> = {
  tenant: Building2,
  task: Cog,
  runbook: BookOpen,
  technician: Wrench,
  ad_user: User,
  ad_group: UsersRound,
};

const TYPE_LABELS: Record<string, string> = {
  tenant: "Tenant",
  task: "Task",
  runbook: "Runbook",
  technician: "Technician",
  ad_user: "AD User",
  ad_group: "AD Group",
};

function getEntityHref(entityType: string, entityId: string, label: string): string {
  switch (entityType) {
    case "tenant":
      return `/dashboard/tenants/${entityId}`;
    case "task":
      return `/dashboard/tasks/${entityId}`;
    case "runbook":
      return `/dashboard/runbooks/${entityId}`;
    case "technician":
      return `/dashboard/technicians/${entityId}`;
    case "ad_user": {
      const [tenantId] = entityId.split(":");
      return `/dashboard/users?tenant=${tenantId}&search=${encodeURIComponent(label)}`;
    }
    case "ad_group": {
      const [tenantId] = entityId.split(":");
      return `/dashboard/groups?tenant=${tenantId}&search=${encodeURIComponent(label)}`;
    }
    default:
      return "/dashboard";
  }
}

export function FavoritesWidget() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookmarks?limit=10")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Bookmark[]) => setBookmarks(data))
      .catch(() => setBookmarks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Star className="w-5 h-5 text-[var(--warning)]" />
          My Favorites
        </h3>
        {bookmarks.length >= 10 && (
          <Link
            href="/dashboard"
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            View all
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
          <span className="ml-2 text-sm text-[var(--text-secondary)]">
            Loading favorites...
          </span>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-[var(--bg-hover)] rounded-xl flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            No favorites yet. Star items to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bookmark) => {
            const Icon = TYPE_ICONS[bookmark.entityType] || Star;
            const typeLabel = TYPE_LABELS[bookmark.entityType] || bookmark.entityType;
            const href = getEntityHref(
              bookmark.entityType,
              bookmark.entityId,
              bookmark.label
            );

            return (
              <Link
                key={bookmark.id}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Icon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <span className="text-sm text-[var(--text-primary)] truncate flex-1">
                  {bookmark.label}
                </span>
                <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full shrink-0">
                  {typeLabel}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
