"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, Check, Loader2 } from "lucide-react";

interface FieldWithValue {
  fieldId: number;
  fieldName: string;
  fieldType: string;
  options: string | null;
  isRequired: boolean;
  value: string;
}

export function CustomFieldsEditor({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const [fields, setFields] = useState<FieldWithValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch(
      `/api/custom-fields/values?entityType=${entityType}&entityId=${entityId}`
    )
      .then((r) => r.json())
      .then((data: FieldWithValue[]) => {
        setFields(data);
        const vals: Record<number, string> = {};
        data.forEach((f) => {
          vals[f.fieldId] = f.value;
        });
        setValues(vals);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [entityType, entityId]);

  const handleSave = async (fieldId: number) => {
    setSaving((prev) => ({ ...prev, [fieldId]: true }));
    setSaved((prev) => ({ ...prev, [fieldId]: false }));
    try {
      const res = await fetch("/api/custom-fields/values", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId,
          entityType,
          entityId,
          value: values[fieldId] ?? "",
        }),
      });
      if (res.ok) {
        setSaved((prev) => ({ ...prev, [fieldId]: true }));
        setTimeout(
          () => setSaved((prev) => ({ ...prev, [fieldId]: false })),
          2000
        );
      }
    } finally {
      setSaving((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal
            className="w-5 h-5"
            style={{ color: "var(--accent)" }}
          />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Custom Fields
          </h3>
        </div>
        <div className="text-sm text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  if (fields.length === 0) return null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal
          className="w-5 h-5"
          style={{ color: "var(--accent)" }}
        />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Custom Fields
        </h3>
      </div>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.fieldId} className="flex items-center gap-3">
            <label className="text-sm text-[var(--text-secondary)] w-32 shrink-0 truncate">
              {field.fieldName}
              {field.isRequired && (
                <span className="text-[var(--error)] ml-0.5">*</span>
              )}
            </label>
            <div className="flex-1">
              {field.fieldType === "select" ? (
                <select
                  value={values[field.fieldId] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.fieldId]: e.target.value,
                    }))
                  }
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">-- Select --</option>
                  {field.options?.split(",").map((opt) => (
                    <option key={opt.trim()} value={opt.trim()}>
                      {opt.trim()}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    field.fieldType === "number"
                      ? "number"
                      : field.fieldType === "date"
                        ? "date"
                        : "text"
                  }
                  value={values[field.fieldId] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.fieldId]: e.target.value,
                    }))
                  }
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => handleSave(field.fieldId)}
              disabled={saving[field.fieldId]}
              className="p-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
            >
              {saving[field.fieldId] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved[field.fieldId] ? (
                <Check className="w-4 h-4 text-[var(--success)]" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
