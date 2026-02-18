"use client";

import { useRouter, usePathname } from "next/navigation";

export function RunbookCategoryFilter({
  categories,
  active,
}: {
  categories: string[];
  active: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(cat: string) {
    if (cat) {
      router.push(`${pathname}?category=${encodeURIComponent(cat)}`);
    } else {
      router.push(pathname);
    }
  }

  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <button
        onClick={() => handleChange("")}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          !active
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleChange(cat)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            active === cat
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
