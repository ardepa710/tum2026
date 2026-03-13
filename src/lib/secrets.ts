/**
 * Secrets Manager — Password Manager vault via Bitwarden SDK
 *
 * Uses the Bitwarden SDK's low-level runCommand() to authenticate with
 * the Vaultwarden Password Manager (not Secrets Manager) using a User
 * API Key + master password. After login, syncs the vault once per cold
 * start and reads Login items from a specific collection by item name.
 *
 * Vault item convention:
 *   - Item type: Login
 *   - Name: the environment variable key (e.g. "NINJA_CLIENT_ID")
 *   - Password field: the secret value
 *   - Collection: VAULTWARDEN_COLLECTION_ID
 *
 * Required env vars (bootstrap — stay in Vercel):
 *   VAULTWARDEN_URL           https://pwd.ardepa.site
 *   VAULTWARDEN_CLIENT_ID     user.xxxxxxxx-... (from vault profile → API Key)
 *   VAULTWARDEN_CLIENT_SECRET the client_secret from vault profile → API Key
 *   VAULTWARDEN_MASTER_PASSWORD master password of the vault user
 *   VAULTWARDEN_COLLECTION_ID  UUID of the TUM2026 collection
 *
 * In development: if any of the above is missing, falls back to process.env[key].
 */

import { BitwardenClient, DeviceType } from "@bitwarden/sdk-napi";
import type { ClientSettings } from "@bitwarden/sdk-napi/dist/bitwarden_client/schemas";

// ---------------------------------------------------------------------------
// Types for runCommand JSON protocol
// ---------------------------------------------------------------------------

interface RunCommandResponse<T> {
  success: boolean;
  errorMessage?: string;
  data?: T;
}

interface SyncCipher {
  name: string;
  collectionIds: string[];
  login?: { password?: string | null } | null;
}

interface SyncData {
  ciphers: SyncCipher[];
}

// ---------------------------------------------------------------------------
// 1-hour in-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL = 3_600_000; // 1 hour

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isConfigured(): boolean {
  return !!(
    process.env.VAULTWARDEN_URL &&
    process.env.VAULTWARDEN_CLIENT_ID &&
    process.env.VAULTWARDEN_CLIENT_SECRET &&
    process.env.VAULTWARDEN_MASTER_PASSWORD &&
    process.env.VAULTWARDEN_COLLECTION_ID
  );
}

function buildClient(): BitwardenClient {
  const vaultUrl = process.env.VAULTWARDEN_URL!.replace(/\/$/, "");
  const settings: ClientSettings = {
    apiUrl: `${vaultUrl}/api`,
    identityUrl: `${vaultUrl}/identity`,
    deviceType: DeviceType.SDK,
    userAgent: "TUM2026",
  };
  // LogLevel 2 = Info
  return new BitwardenClient(settings, 2);
}

async function runCmd<T>(
  client: BitwardenClient,
  command: object,
): Promise<T> {
  // runCommand is on the underlying rust binding (.client property)
  const raw = await (client as unknown as {
    client: { runCommand(s: string): Promise<string> };
  }).client.runCommand(JSON.stringify(command));

  const res = JSON.parse(raw) as RunCommandResponse<T>;
  if (!res.success) {
    throw new Error(res.errorMessage ?? "Bitwarden command failed");
  }
  return res.data as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch ALL secrets from the Vaultwarden collection in a single auth+sync.
 * Populates the in-memory cache. Called by instrumentation.ts at cold start.
 *
 * @returns Record mapping item name → password value for every Login item
 *          found in VAULTWARDEN_COLLECTION_ID.
 */
export async function getAllSecrets(): Promise<Record<string, string>> {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("[secrets] Vaultwarden not configured — no secrets loaded");
    }
    return {};
  }

  const client = buildClient();

  // 1. Authenticate (API Key + master password for vault decryption)
  await runCmd(client, {
    apiKeyLogin: {
      clientId: process.env.VAULTWARDEN_CLIENT_ID!,
      clientSecret: process.env.VAULTWARDEN_CLIENT_SECRET!,
      password: process.env.VAULTWARDEN_MASTER_PASSWORD!,
    },
  });

  // 2. Sync vault — SDK decrypts items client-side using the derived master key
  const syncData = await runCmd<SyncData>(client, {
    sync: { excludeSubdomains: true },
  });

  const collectionId = process.env.VAULTWARDEN_COLLECTION_ID!;
  const result: Record<string, string> = {};

  for (const cipher of syncData.ciphers ?? []) {
    if (
      cipher.collectionIds.includes(collectionId) &&
      cipher.login?.password
    ) {
      result[cipher.name] = cipher.login.password;
      cache.set(cipher.name, {
        value: cipher.login.password,
        expiresAt: Date.now() + CACHE_TTL,
      });
    }
  }

  return result;
}

/**
 * Retrieve a single secret.
 * Checks the 1-hour cache first. On cache miss, does a full sync.
 * Falls back to process.env[key] in development if Vaultwarden is not set.
 */
export async function getSecret(key: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  // Dev fallback (no Vaultwarden configured locally)
  if (!isConfigured()) {
    const fallback = process.env[key];
    if (fallback) return fallback;
    throw new Error(
      `[secrets] "${key}" not found. Configure Vaultwarden or set ${key} in .env.local`,
    );
  }

  // Cache miss after 1 hr — re-sync to refresh all secrets at once
  const all = await getAllSecrets();
  if (key in all) return all[key];

  // Last resort: direct env fallback in development
  if (process.env.NODE_ENV === "development" && process.env[key]) {
    return process.env[key]!;
  }

  throw new Error(`[secrets] "${key}" not found in Vaultwarden collection`);
}

/** Clear in-memory cache — forces re-fetch from Vaultwarden on next access. */
export function clearSecretCache(): void {
  cache.clear();
}
