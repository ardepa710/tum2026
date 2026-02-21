"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Clock,
  Trash2,
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

interface HistoryItem {
  id: number;
  query: string;
  resultType: string;
  resultId: string;
  clickedLabel: string;
  searchedAt: string;
}

type FilterType = "all" | "tenant" | "task" | "technician" | "runbook" | "user";

const emptyLocal: LocalResults = { tenants: [], tasks: [], technicians: [], runbooks: [] };

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tenant", label: "Tenants" },
  { value: "task", label: "Tasks" },
  { value: "technician", label: "Techs" },
  { value: "runbook", label: "Runbooks" },
  { value: "user", label: "Users" },
];

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

/** Extract numeric/string ID from a FlatItem id like "tenant-5" or "user-3-abc" */
function extractResultId(item: FlatItem): string {
  const parts = item.id.split("-");
  // For user: "user-{tenantId}-{userId}" → return "tenantId-userId"
  if (item.type === "user") return parts.slice(1).join("-");
  // For others: "type-{id}" → return the id part
  return parts.slice(1).join("-");
}

/** Get quick actions for a result type */
function getQuickActions(
  item: FlatItem,
  role?: string
): { label: string; href: string }[] {
  switch (item.type) {
    case "tenant": {
      const id = item.id.replace("tenant-", "");
      return [{ label: "Users", href: `/dashboard/tenants/${id}/users` }];
    }
    case "task":
      return [{ label: "Runs", href: "/dashboard/runs" }];
    case "runbook": {
      if (role === "EDITOR" || role === "ADMIN") {
        const id = item.id.replace("runbook-", "");
        return [{ label: "Edit", href: `/dashboard/runbooks/${id}/edit` }];
      }
      return [];
    }
    default:
      return [];
  }
}

/* ---------- Component ---------- */

export function GlobalSearch({ role }: { role?: string }) {
  const [query, setQuery] = useState("");
  const [localResults, setLocalResults] = useState<LocalResults>(emptyLocal);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [recentSearches, setRecentSearches] = useState<HistoryItem[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const flat = useMemo(() => flattenResults(localResults, userResults), [localResults, userResults]);

  // Apply type filter
  const filtered = useMemo(
    () => (activeFilter === "all" ? flat : flat.filter((i) => i.type === activeFilter)),
    [flat, activeFilter]
  );

  const hasAnyResult = filtered.length > 0;

  /* --- Save to search history (fire-and-forget) --- */
  const saveToHistory = useCallback(
    (item: FlatItem, searchQuery: string) => {
      fetch("/api/search/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          resultType: item.type,
          resultId: extractResultId(item),
          clickedLabel: item.primary,
        }),
      }).catch(() => {
        // fire-and-forget
      });
    },
    []
  );

  /* --- Fetch recent searches --- */
  const fetchRecentSearches = useCallback(async () => {
    try {
      const res = await fetch("/api/search/history");
      if (res.ok) {
        const data: HistoryItem[] = await res.json();
        setRecentSearches(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  /* --- Clear all history --- */
  const clearHistory = useCallback(async () => {
    try {
      await fetch("/api/search/history", { method: "DELETE" });
      setRecentSearches([]);
    } catch {
      // silently fail
    }
  }, []);

  /* --- Remove single recent item from state --- */
  const removeRecentItem = useCallback((itemId: number) => {
    setRecentSearches((prev) => prev.filter((h) => h.id !== itemId));
  }, []);

  /* --- Navigate on select --- */
  const handleSelect = useCallback(
    (item: FlatItem) => {
      // Save to history
      saveToHistory(item, query);

      setIsOpen(false);
      setShowRecent(false);
      setQuery("");
      setLocalResults(emptyLocal);
      setUserResults([]);
      setActiveIndex(-1);
      setHoveredIndex(-1);
      setActiveFilter("all");

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
    [router, saveToHistory, query]
  );

  /* --- Navigate from recent search --- */
  const handleRecentSelect = useCallback(
    (item: HistoryItem) => {
      setIsOpen(false);
      setShowRecent(false);
      setQuery("");
      setActiveIndex(-1);
      setHoveredIndex(-1);
      setActiveFilter("all");

      const type = item.resultType;
      const id = item.resultId;

      switch (type) {
        case "tenant":
          router.push(`/dashboard/tenants/${id}`);
          break;
        case "task":
          router.push("/dashboard/tasks");
          break;
        case "technician":
          router.push("/dashboard/technicians");
          break;
        case "runbook":
          router.push(`/dashboard/runbooks/${id}`);
          break;
        case "user": {
          // resultId format: "tenantId-userId"
          const dashIdx = id.indexOf("-");
          const tenantId = dashIdx >= 0 ? id.substring(0, dashIdx) : id;
          router.push(
            `/dashboard/users?tenant=${tenantId}&search=${encodeURIComponent(item.clickedLabel)}`
          );
          break;
        }
      }
    },
    [router]
  );

  /* --- Handle quick action click --- */
  const handleQuickAction = useCallback(
    (e: React.MouseEvent, item: FlatItem, href: string) => {
      e.stopPropagation();
      e.preventDefault();

      // Save to history
      saveToHistory(item, query);

      setIsOpen(false);
      setShowRecent(false);
      setQuery("");
      setLocalResults(emptyLocal);
      setUserResults([]);
      setActiveIndex(-1);
      setHoveredIndex(-1);
      setActiveFilter("all");

      router.push(href);
    },
    [router, saveToHistory, query]
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

  /* --- Reset filter when query changes --- */
  useEffect(() => {
    setActiveFilter("all");
  }, [query]);

  /* --- Debounced parallel fetch --- */
  useEffect(() => {
    if (query.trim().length < 2) {
      setLocalResults(emptyLocal);
      setUserResults([]);
      // Don't close if showing recent searches
      if (!showRecent) {
        setIsOpen(false);
      }
      setActiveIndex(-1);
      return;
    }

    // We have a real query, hide recent
    setShowRecent(false);

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
    const userTimeout = setTimeout(async () => {
      setIsLoadingUsers(true);
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
      setIsLoadingUsers(false);
    };
  }, [query, showRecent]);

  /* --- Reset activeIndex when results change --- */
  useEffect(() => {
    setActiveIndex(-1);
    setHoveredIndex(-1);
  }, [localResults, userResults, activeFilter]);

  /* --- Close on click outside --- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowRecent(false);
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
        setShowRecent(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        return;
      }

      // Handle recent searches keyboard nav
      if (showRecent && recentSearches.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((prev) => (prev < recentSearches.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : recentSearches.length - 1));
        } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < recentSearches.length) {
          e.preventDefault();
          handleRecentSelect(recentSearches[activeIndex]);
        }
        return;
      }

      if (!isOpen || filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        handleSelect(filtered[activeIndex]);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showRecent, filtered, recentSearches, activeIndex, handleSelect, handleRecentSelect]);

  function handleClear() {
    setQuery("");
    setLocalResults(emptyLocal);
    setUserResults([]);
    setIsOpen(false);
    setShowRecent(false);
    setActiveIndex(-1);
    setHoveredIndex(-1);
    setActiveFilter("all");
    inputRef.current?.focus();
  }

  function handleInputFocus() {
    if (query.trim().length >= 2 && (hasAnyResult || flat.length > 0)) {
      setIsOpen(true);
    } else if (query.trim().length < 2) {
      // Show recent searches on focus with empty/short query
      fetchRecentSearches().then(() => {
        // Only show recent if user hasn't started typing
        if ((inputRef.current?.value ?? "").trim().length < 2) {
          setShowRecent(true);
        }
      });
    }
  }

  /* --- Render filter chips --- */
  function renderFilterChips() {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border)] overflow-x-auto">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full whitespace-nowrap transition-colors ${
              activeFilter === opt.value
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  /* --- Render recent searches dropdown --- */
  function renderRecentSearches() {
    if (recentSearches.length === 0) {
      return (
        <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
          No recent searches
        </div>
      );
    }

    return (
      <div>
        {/* Section header */}
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 bg-[var(--bg-primary)]/50">
          <Clock className="w-3 h-3" />
          Recent
        </div>

        {recentSearches.map((item, idx) => {
          const Icon = iconForType(item.resultType as FlatItem["type"]);
          return (
            <div
              key={item.id}
              data-active={idx === activeIndex || undefined}
              className="w-full px-4 py-2.5 hover:bg-[var(--bg-hover)] data-[active]:bg-[var(--bg-hover)] transition-colors cursor-pointer flex items-center gap-3 text-left group"
            >
              <button
                onClick={() => handleRecentSelect(item)}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-medium text-[var(--accent)] shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {item.clickedLabel}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {item.resultType}
                  </p>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeRecentItem(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all shrink-0"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Clear history link */}
        <div className="px-3 py-2 border-t border-[var(--border)]">
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear history
          </button>
        </div>
      </div>
    );
  }

  /* --- Render grouped sections --- */
  function renderResults() {
    const types: FlatItem["type"][] = ["tenant", "task", "technician", "runbook", "user"];
    let globalIdx = 0;
    const sections: React.ReactNode[] = [];

    for (const type of types) {
      const items = filtered.filter((i) => i.type === type);
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
              const isActive = idx === activeIndex || idx === hoveredIndex;
              const actions = getQuickActions(item, role);

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(-1)}
                  data-active={idx === activeIndex || undefined}
                  className="w-full px-4 py-2.5 hover:bg-[var(--bg-hover)] data-[active]:bg-[var(--bg-hover)] transition-colors cursor-pointer flex items-center gap-3 text-left group"
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

                  {/* Quick action buttons — show on hover/active */}
                  {isActive && actions.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {actions.map((action) => (
                        <button
                          key={action.href}
                          type="button"
                          onClick={(e) => handleQuickAction(e, item, action.href)}
                          className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors cursor-pointer"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {item.badge && !isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-muted)] font-medium shrink-0">
                      {item.badge}
                    </span>
                  )}
                  {item.badge && isActive && actions.length === 0 && (
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

  const dropdownOpen = isOpen || showRecent;

  return (
    <div className="relative w-80" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleInputFocus}
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
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-2 w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-[80] max-h-[420px] overflow-y-auto">
          {showRecent ? (
            renderRecentSearches()
          ) : (
            <>
              {/* Type filter chips */}
              {renderFilterChips()}

              {showNoResults ? (
                <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                  No results found
                </div>
              ) : (
                renderResults()
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
