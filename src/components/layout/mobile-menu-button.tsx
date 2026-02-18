"use client";

import { Menu } from "lucide-react";

export function MobileMenuButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-mobile-menu"))}
      className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
