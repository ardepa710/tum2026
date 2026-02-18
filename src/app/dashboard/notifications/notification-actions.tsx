"use client";

import { useTransition } from "react";
import { CheckCheck, Check, Trash2 } from "lucide-react";
import { markAllAsRead, markAsRead, deleteNotification } from "./actions";

interface Props {
  type: "markAllRead" | "markRead" | "delete";
  id?: number;
}

export function NotificationActions({ type, id }: Props) {
  const [isPending, startTransition] = useTransition();

  if (type === "markAllRead") {
    return (
      <button
        onClick={() => startTransition(() => markAllAsRead())}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
      >
        <CheckCheck className="w-3.5 h-3.5" />
        {isPending ? "Marking..." : "Mark all read"}
      </button>
    );
  }

  if (type === "markRead" && id !== undefined) {
    return (
      <button
        onClick={() => startTransition(() => markAsRead(id))}
        disabled={isPending}
        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
        title="Mark as read"
      >
        <Check className="w-4 h-4" />
      </button>
    );
  }

  if (type === "delete" && id !== undefined) {
    return (
      <button
        onClick={() => startTransition(() => deleteNotification(id))}
        disabled={isPending}
        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
        title="Delete notification"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  }

  return null;
}
