/**
 * Next.js Instrumentation Hook — runs once on cold start (Node.js runtime only).
 *
 * Fetches sensitive secrets from Vaultwarden and injects them into process.env
 * before any request handler runs. All existing code that reads process.env.X
 * continues to work transparently — no changes needed in auth.ts, ninja.ts,
 * graph.ts, or sophos.ts.
 *
 * Secrets that stay in Vercel/env vars (required by Edge runtime or bootstrap):
 *   AUTH_SECRET, AUTH_MICROSOFT_ENTRA_ID_ID, AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
 *   DATABASE_URL, AUTH_TRUST_HOST, VAULTWARDEN_URL, VAULTWARDEN_ACCESS_TOKEN
 *
 * Secrets loaded from Vaultwarden (never stored in Vercel env vars in production):
 *   AUTH_MICROSOFT_ENTRA_ID_SECRET, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET,
 *   NINJA_CLIENT_ID, NINJA_CLIENT_SECRET, SOPHOS_CLIENT_ID, SOPHOS_CLIENT_SECRET
 *
 * In development: if VAULTWARDEN_URL/ACCESS_TOKEN are not set, secrets.ts falls
 * back to .env.local automatically. No special setup needed for local dev.
 */

/** Secrets to pre-load from Vaultwarden at startup. */
const VAULTWARDEN_SECRETS = [
  "AUTH_MICROSOFT_ENTRA_ID_SECRET",
  "GRAPH_CLIENT_ID",
  "GRAPH_CLIENT_SECRET",
  "NINJA_CLIENT_ID",
  "NINJA_CLIENT_SECRET",
  "SOPHOS_CLIENT_ID",
  "SOPHOS_CLIENT_SECRET",
] as const;

export async function register() {
  // Only runs in Node.js runtime — Edge (middleware) uses process.env directly.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Skip Vaultwarden if not configured (local dev without Vaultwarden).
  if (!process.env.VAULTWARDEN_URL || !process.env.VAULTWARDEN_ACCESS_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[instrumentation] VAULTWARDEN_URL or VAULTWARDEN_ACCESS_TOKEN not set — " +
          "secrets will fall back to environment variables.",
      );
    }
    return;
  }

  // Dynamic import keeps @bitwarden/sdk-napi out of the Edge bundle.
  const { getSecret } = await import("@/lib/secrets");

  const results = await Promise.allSettled(
    VAULTWARDEN_SECRETS.map(async (key) => {
      const value = await getSecret(key);
      process.env[key] = value;
    }),
  );

  // Log failures — a missing secret will cause the affected service to fail at
  // call time (not at startup), with a clear error message from the SDK.
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[instrumentation] Failed to load secret "${VAULTWARDEN_SECRETS[i]}" from Vaultwarden:`,
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
    }
  });
}
