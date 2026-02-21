import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionRole, hasMinRole } from "@/lib/rbac";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { DeleteRunbookButton } from "@/components/delete-runbook-button";
import { BookmarkButton } from "@/components/bookmark-button";
import {
  BookOpen,
  Pencil,
  ArrowLeft,
  LinkIcon,
  User,
  Calendar,
} from "lucide-react";
import { CATEGORY_COLORS } from "../constants";

export default async function RunbookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const runbookId = Number(id);
  if (isNaN(runbookId)) notFound();

  const role = await getSessionRole();

  const runbook = await prisma.runbook.findUnique({
    where: { id: runbookId },
    include: {
      task: { select: { id: true, taskName: true } },
    },
  });

  if (!runbook) notFound();

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/runbooks"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Runbooks
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-7 h-7" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {runbook.title}
              </h2>
              <BookmarkButton
                entityType="runbook"
                entityId={String(runbook.id)}
                label={runbook.title}
                metadata={{ category: runbook.category }}
              />
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              {runbook.category && (
                <span
                  className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-md ${
                    CATEGORY_COLORS[runbook.category] ??
                    CATEGORY_COLORS.Other
                  }`}
                >
                  {runbook.category}
                </span>
              )}
              {runbook.task && (
                <div className="flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <Link
                    href={`/dashboard/tasks/${runbook.task.id}`}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    {runbook.task.taskName}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        {hasMinRole(role, "EDITOR") && (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/runbooks/${runbook.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] text-sm text-[var(--text-primary)] font-medium rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
            <DeleteRunbookButton id={runbook.id} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        {runbook.content ? (
          <MarkdownRenderer content={runbook.content} />
        ) : (
          <p className="text-sm text-[var(--text-muted)] italic">
            No content yet.
          </p>
        )}
      </div>

      {/* Footer Metadata */}
      <div className="flex items-center gap-6 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span>Created by {runbook.createdBy}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Created{" "}
            {runbook.createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Updated{" "}
            {runbook.updatedAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
