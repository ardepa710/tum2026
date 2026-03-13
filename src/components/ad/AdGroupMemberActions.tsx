"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Loader2, Search, X } from "lucide-react";

interface Member {
  id: number;
  displayName: string;
  samAccountName: string;
  department: string | null;
  accountEnabled: boolean;
}

interface AdGroupMemberActionsProps {
  tenantId: number;
  groupSam: string;
  members: Member[];
}

export function AdGroupMemberActions({
  tenantId,
  groupSam,
  members,
}: AdGroupMemberActionsProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [addSam, setAddSam] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = search.trim()
    ? members.filter(
        (m) =>
          m.displayName.toLowerCase().includes(search.toLowerCase()) ||
          m.samAccountName.toLowerCase().includes(search.toLowerCase()) ||
          (m.department ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : members;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const sam = addSam.trim();
    if (!sam) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/ad/groups/${encodeURIComponent(groupSam)}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ samAccountName: sam }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add member");
      }
      setAddSam("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userSam: string) {
    setRemovingId(userSam);
    setError(null);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/ad/groups/${encodeURIComponent(groupSam)}/members/${encodeURIComponent(userSam)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to remove member");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Filter members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-[var(--border)]">
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">
            {search ? "No members match your filter" : "No members in this group"}
          </p>
        ) : (
          filtered.map((m) => (
            <div
              key={m.samAccountName}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${m.accountEnabled ? "text-[var(--text-primary)]" : "text-[var(--error)]"}`}>
                  {m.displayName}
                </p>
                <p className="text-xs text-[var(--text-muted)] font-mono">{m.samAccountName}</p>
                {m.department && (
                  <p className="text-xs text-[var(--text-muted)]">{m.department}</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(m.samAccountName)}
                disabled={removingId === m.samAccountName}
                className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors disabled:opacity-50"
                title={`Remove ${m.samAccountName} from group`}
              >
                {removingId === m.samAccountName ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add member form */}
      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Add Member
        </p>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="SAM account name…"
            value={addSam}
            onChange={(e) => setAddSam(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={adding || !addSam.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {adding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            Add
          </button>
        </form>
        {error && (
          <p className="text-xs text-[var(--error)] mt-1.5">{error}</p>
        )}
      </div>
    </div>
  );
}
