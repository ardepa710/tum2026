"use client";

import { useState, useTransition, useEffect } from "react";
import { updateTheme } from "@/app/dashboard/theme-actions";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ initialTheme }: { initialTheme: string }) {
  const [theme, setTheme] = useState(initialTheme);
  const [isPending, startTransition] = useTransition();

  // Sync with actual DOM class on mount (in case cookie differs)
  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setTheme(isLight ? "light" : "dark");
  }, []);

  function handleToggle() {
    const newTheme = theme === "dark" ? "light" : "dark";

    // Apply to DOM immediately
    document.documentElement.classList.toggle("light", newTheme === "light");
    setTheme(newTheme);

    // Persist to DB + cookie
    startTransition(() => updateTheme(newTheme));
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}
