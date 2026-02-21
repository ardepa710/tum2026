import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { CustomFieldForm } from "@/components/custom-field-form";
import { deleteCustomField } from "./actions";
import { SlidersHorizontal, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function CustomFieldsPage() {
  await requireRole("ADMIN");

  const fields = await prisma.customField.findMany({
    orderBy: [{ entityType: "asc" }, { sortOrder: "asc" }],
  });

  const tenantFields = fields.filter((f) => f.entityType === "tenant");
  const taskFields = fields.filter((f) => f.entityType === "task");

  const fieldTypeLabels: Record<string, string> = {
    text: "Text",
    number: "Number",
    date: "Date",
    select: "Select",
  };

  return (
    <div>
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Custom Fields
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Define custom fields for tenants and tasks
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <SlidersHorizontal
            className="w-5 h-5"
            style={{ color: "var(--accent)" }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {/* Tenant Fields */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Tenant Fields
          </h3>
          {tenantFields.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No custom fields for tenants yet.
            </p>
          ) : (
            <div className="space-y-2">
              {tenantFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between bg-[var(--bg-primary)] rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {field.fieldName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)]">
                      {fieldTypeLabels[field.fieldType] || field.fieldType}
                    </span>
                    {field.isRequired && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--warning)]/10 text-[var(--warning)]">
                        Required
                      </span>
                    )}
                    {field.options && (
                      <span className="text-xs text-[var(--text-muted)] truncate max-w-48">
                        {field.options}
                      </span>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await deleteCustomField(field.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Fields */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Task Fields
          </h3>
          {taskFields.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No custom fields for tasks yet.
            </p>
          ) : (
            <div className="space-y-2">
              {taskFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between bg-[var(--bg-primary)] rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {field.fieldName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)]">
                      {fieldTypeLabels[field.fieldType] || field.fieldType}
                    </span>
                    {field.isRequired && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--warning)]/10 text-[var(--warning)]">
                        Required
                      </span>
                    )}
                    {field.options && (
                      <span className="text-xs text-[var(--text-muted)] truncate max-w-48">
                        {field.options}
                      </span>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await deleteCustomField(field.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Field */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Add New Field
          </h3>
          <CustomFieldForm />
        </div>
      </div>
    </div>
  );
}
