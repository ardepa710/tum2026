import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionRole, hasMinRole } from "@/lib/rbac";
import { RunbookCategoryFilter } from "./category-filter";
import {
  BookOpen,
  Plus,
  Calendar,
  User,
  LinkIcon,
} from "lucide-react";
import { CATEGORY_COLORS } from "./constants";

export default async function RunbooksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const role = await getSessionRole();

  const runbooks = await prisma.runbook.findMany({
    where: category ? { category } : undefined,
    include: {
      task: { select: { taskName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const allCategories = await prisma.runbook.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  const categories = allCategories
    .map((r) => r.category)
    .filter((c): c is string => c !== null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Runbooks
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {runbooks.length} runbook{runbooks.length !== 1 ? "s" : ""}
            {category ? ` in ${category}` : ""}
          </p>
        </div>
        {hasMinRole(role, "EDITOR") && (
          <Link
            href="/dashboard/runbooks/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Runbook
          </Link>
        )}
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <RunbookCategoryFilter
          categories={categories}
          active={category ?? null}
        />
      )}

      {/* Runbook Grid */}
      {runbooks.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No runbooks yet
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            {category
              ? `No runbooks found in the "${category}" category.`
              : "Get started by creating your first runbook."}
          </p>
          {!category && hasMinRole(role, "EDITOR") && (
            <Link
              href="/dashboard/runbooks/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Runbook
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runbooks.map((runbook) => (
            <Link
              key={runbook.id}
              href={`/dashboard/runbooks/${runbook.id}`}
              className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)] transition-all hover:shadow-lg hover:shadow-[var(--accent)]/5"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
                    <BookOpen
                      className="w-5 h-5"
                      style={{ color: "var(--accent)" }}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {runbook.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Category Badge */}
              {runbook.category && (
                <div className="mb-3">
                  <span
                    className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-md ${
                      CATEGORY_COLORS[runbook.category] ??
                      CATEGORY_COLORS.Other
                    }`}
                  >
                    {runbook.category}
                  </span>
                </div>
              )}

              {/* Linked Task */}
              {runbook.task && (
                <div className="flex items-center gap-2 mb-3">
                  <LinkIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-secondary)] truncate">
                    {runbook.task.taskName}
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[120px]">
                    {runbook.createdBy}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {runbook.updatedAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
