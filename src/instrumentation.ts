/**
 * Next.js Instrumentation Hook — runs once on cold start (Node.js runtime only).
 *
 * Calls getAllSecrets() which does a single Vaultwarden auth+sync, then injects
 * every returned secret into process.env. All existing code (auth.ts, ninja.ts,
 * graph.ts, sophos.ts) continues reading process.env.X transparently.
 *
 * Secrets that stay in Vercel env vars (Edge runtime / bootstrap):
 *   AUTH_SECRET, AUTH_MICROSOFT_ENTRA_ID_ID, AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
 *   AUTH_TRUST_HOST, DATABASE_URL,
 *   VAULTWARDEN_URL, VAULTWARDEN_CLIENT_ID, VAULTWARDEN_CLIENT_SECRET,
 *   VAULTWARDEN_MASTER_PASSWORD, VAULTWARDEN_COLLECTION_ID
 *
 * Secrets loaded from Vaultwarden (Login items in the TUM2026 collection):
 *   AUTH_MICROSOFT_ENTRA_ID_SECRET, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET,
 *   NINJA_CLIENT_ID, NINJA_CLIENT_SECRET, SOPHOS_CLIENT_ID, SOPHOS_CLIENT_SECRET
 *
 * In development: if Vaultwarden vars are not set, getAllSecrets() returns {}
 * and the secrets remain as-is from .env.local.
 */

export async function register() {
  // Edge runtime (middleware) cannot use the Bitwarden SDK — skip.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Dynamic import keeps @bitwarden/sdk-napi out of the Edge bundle.
  const { getAllSecrets } = await import("@/lib/secrets");

  try {
    const secrets = await getAllSecrets();
    const loaded = Object.keys(secrets).length;

    for (const [key, value] of Object.entries(secrets)) {
      process.env[key] = value;
    }

    if (loaded > 0) {
      console.log(`[instrumentation] Loaded ${loaded} secrets from Vaultwarden`);
    }
  } catch (err) {
    // Log but don't crash — app continues with whatever env vars are set.
    console.error(
      "[instrumentation] Failed to load secrets from Vaultwarden:",
      err instanceof Error ? err.message : err,
    );
  }
}
