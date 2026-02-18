"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  Building2,
  ListChecks,
  Users,
  BookOpen,
  User,
} from "lucide-react";

/* ---------- Types ---------- */

interface UserResult {
  tenantId: number;
  tenantName: string;
  tenantAbbrv: string;
  userId: string;
  displayName: string;
  email: string;
}

interface LocalResults {
  tenants: { id: number; tenantName: string; tenantAbbrv: string }[];
  tasks: { id: number; taskName: string; taskCode: string }[];
  technicians: { id: number; displayName: string; email: string }[];
  runbooks: { id: number; title: string; category: string | null }[];
}

interface FlatItem {
  type: "tenant" | "task" | "technician" | "runbook" | "user";
  id: string;
  primary: string;
  secondary: string;
  badge?: string;
}

const emptyLocal: LocalResults = { tenants: [], tasks: [], technicians: [], runbooks: [] };

/* ---------- Helpers ---------- */

function flattenResults(local: LocalResults, users: UserResult[]): FlatItem[] {
  const items: FlatItem[] = [];

  for (const t of local.tenants) {
    items.push({
      type: "tenant",
      id: `tenant-${t.id}`,
      primary: t.tenantName,
      secondary: t.tenantAbbrv,
    });
  }
  for (const t of local.tasks) {
    items.push({
      type: "task",
      id: `task-${t.id}`,
      primary: t.taskName,
      secondary: t.taskCode,
    });
  }
  for (const t of local.technicians) {
    items.push({
      type: "technician",
      id: `tech-${t.id}`,
      primary: t.displayName,
      secondary: t.email,
    });
  }
  for (const r of local.runbooks) {
    items.push({
      type: "runbook",
      id: `runbook-${r.id}`,
      primary: r.title,
      secondary: r.category ?? "Uncategorized",
    });
  }
  for (const u of users) {
    items.push({
      type: "user",
      id: `user-${u.tenantId}-${u.userId}`,
      primary: u.displayName,
      secondary: u.email,
      badge: u.tenantAbbrv,
    });
  }

  return items;
}

function iconForType(type: FlatItem["type"]) {
  switch (type) {
    case "tenant":
      return Building2;
    case "task":
      return ListChecks;
    case "technician":
      return Users;
    case "runbook":
      return BookOpen;
    case "user":
      return User;
  }
}

function labelForType(type: FlatItem["type"]) {
  switch (type) {
    case "tenant":
      return "Tenants";
    case "task":
      return "Tasks";
    case "technician":
      return "Technicians";
    case "runbook":
      return "Runbooks";
    case "user":
      return "AD Users";
  }
}

/* ---------- Component ---------- */

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [localResults, setLocalResults] = useState<LocalResults>(emptyLocal);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const flat = flattenResults(localResults, userResults);
  const hasAnyResult = flat.length > 0;

  /* --- Navigate on select --- */
  const handleSelect = useCallback(
    (item: FlatItem) => {
      setIsOpen(false);
      setQuery("");
      setLocalResults(emptyLocal);
      setUserResults([]);
      setActiveIndex(-1);

      switch (item.type) {
        case "tenant": {
          const id = item.id.replace("tenant-", "");
          router.push(`/dashboard/tenants/${id}`);
          break;
        }
        case "task":
          router.push("/dashboard/tasks");
          break;
        case "technician":
          router.push("/dashboard/technicians");
          break;
        case "runbook": {
          const id = item.id.replace("runbook-", "");
          router.push(`/dashboard/runbooks/${id}`);
          break;
        }
        case "user": {
          // id format: user-{tenantId}-{userId}
          const parts = item.id.split("-");
          const tenantId = parts[1];
          router.push(
            `/dashboard/users?tenant=${tenantId}&search=${encodeURIComponent(item.primary)}`
          );
          break;
        }
      }
    },
    [router]
  );

  /* --- Cmd/Ctrl+K to focus --- */
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, []);

  /* --- Debounced parallel fetch --- */
  useEffect(() => {
    if (query.trim().length < 2) {
      setLocalResults(emptyLocal);
      setUserResults([]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    const encoded = encodeURIComponent(query.trim());

    // Local search: fast, short debounce
    const localTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/local?q=${encoded}`);
        if (res.ok) {
          const data: LocalResults = await res.json();
          setLocalResults(data);
          setIsOpen(true);
        }
      } catch {
        setLocalResults(emptyLocal);
      }
    }, 150);

    // User search: slower, longer debounce
    setIsLoadingUsers(true);
    const userTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encoded}`);
        if (res.ok) {
          const data: UserResult[] = await res.json();
          setUserResults(data);
          setIsOpen(true);
        }
      } catch {
        setUserResults([]);
      } finally {
        setIsLoadingUsers(false);
      }
    }, 500);

    return () => {
      clearTimeout(localTimeout);
      clearTimeout(userTimeout);
    };
  }, [query]);

  /* --- Close on click outside --- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* --- Escape + Arrow keys --- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        return;
      }

      if (!isOpen || flat.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < flat.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flat.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < flat.length) {
        e.preventDefault();
        handleSelect(flat[activeIndex]);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flat, activeIndex, handleSelect]);

  function handleClear() {
    setQuery("");
    setLocalResults(emptyLocal);
    setUserResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  /* --- Render grouped sections --- */
  function renderResults() {
    const types: FlatItem["type"][] = ["tenant", "task", "technician", "runbook", "user"];
    let globalIdx = 0;
    const sections: React.ReactNode[] = [];

    for (const type of types) {
      const items = flat.filter((i) => i.type === type);
      if (items.length === 0 && type !== "user") continue;
      if (items.length === 0 && type === "user" && !isLoadingUsers) continue;

      const Icon = iconForType(type);
      const label = labelForType(type);

      sections.push(
        <div key={type}>
          {/* Section header */}
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 bg-[var(--bg-primary)]/50">
            <Icon className="w-3 h-3" />
            {label}
            {type === "user" && isLoadingUsers && (
              <Loader2 className="w-3 h-3 animate-spin ml-auto" />
            )}
          </div>

          {items.length === 0 && type === "user" && isLoadingUsers ? (
            <div className="px-4 py-2 text-xs text-[var(--text-muted)]">
              Searching across tenants...
            </div>
          ) : items.length === 0 && type === "user" && !isLoadingUsers ? null : (
            items.map((item) => {
              const idx = globalIdx++;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  data-active={idx === activeIndex || undefined}
                  className="w-full px-4 py-2.5 hover:bg-[var(--bg-hover)] data-[active]:bg-[var(--bg-hover)] transition-colors cursor-pointer flex items-center gap-3 text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-medium text-[var(--accent)] shrink-0">
                    {item.primary?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {item.primary}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{item.secondary}</p>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-muted)] font-medium shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      );

      // globalIdx only advances inside items.map, so empty sections are handled correctly
    }

    return sections;
  }

  const showNoResults =
    !hasAnyResult && !isLoadingUsers && query.trim().length >= 2;

  return (
    <div className="relative w-80" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (hasAnyResult && query.trim().length >= 2) setIsOpen(true);
        }}
        placeholder="Search tenants, users..."
        className="w-full pl-10 pr-20 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
      />

      {/* Right side: Cmd+K badge or clear / spinner */}
      {query ? (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-hover)] border border-[var(--border)] rounded">
          {typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent) ? "\u2318" : "Ctrl+"}K
        </kbd>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-[80] max-h-[420px] overflow-y-auto">
          {showNoResults ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No results found
            </div>
          ) : (
            renderResults()
          )}
        </div>
      )}
    </div>
  );
}
