"use client";

import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";

type BookmarkButtonProps = {
  entityType: string;
  entityId: string;
  label: string;
  metadata?: Record<string, unknown>;
  className?: string;
};

type BookmarkRecord = {
  id: number;
  entityType: string;
  entityId: string;
  label: string;
};

export function BookmarkButton({
  entityType,
  entityId,
  label,
  metadata,
  className = "",
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Check if this entity is already bookmarked
  useEffect(() => {
    let cancelled = false;

    fetch("/api/bookmarks?limit=100")
      .then((res) => (res.ok ? res.json() : []))
      .then((bookmarks: BookmarkRecord[]) => {
        if (cancelled) return;
        const found = bookmarks.some(
          (b) => b.entityType === entityType && b.entityId === entityId
        );
        setBookmarked(found);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  async function toggle() {
    setToggling(true);
    try {
      if (bookmarked) {
        await fetch(
          `/api/bookmarks?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
          { method: "DELETE" }
        );
        setBookmarked(false);
      } else {
        await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityType, entityId, label, metadata }),
        });
        setBookmarked(true);
      }
    } catch {
      // Silently fail
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <button
        disabled
        className={`p-2 rounded-lg text-[var(--text-muted)] ${className}`}
        title="Loading..."
      >
        <Loader2 className="w-5 h-5 animate-spin" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={toggling}
      className={`p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)] ${className}`}
      title={bookmarked ? "Remove from favorites" : "Add to favorites"}
    >
      {toggling ? (
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
      ) : (
        <Star
          className={`w-5 h-5 ${
            bookmarked
              ? "fill-[var(--warning)] text-[var(--warning)]"
              : "text-[var(--text-muted)]"
          }`}
        />
      )}
    </button>
  );
}
