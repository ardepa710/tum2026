"use client";

import { signIn } from "next-auth/react";
import { Shield } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("microsoft-entra-id", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">TUM 2026</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            IT Admin Dashboard
          </p>
        </div>

        {/* Login card */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Sign in
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Use your Microsoft corporate account to access the dashboard.
          </p>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
            )}
            {loading ? "Redirecting..." : "Sign in with Microsoft"}
          </button>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Protected by Microsoft Entra ID
        </p>
      </div>
    </div>
  );
}
