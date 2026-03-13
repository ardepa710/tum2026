/**
 * Secrets Manager — reads Login items from a Vaultwarden collection at cold start.
 *
 * Uses the Bitwarden REST API + Node.js native crypto for full E2E decryption.
 * No SDK dependency — the @bitwarden/sdk-napi v1.0.0 only implements Secrets
 * Manager at runtime despite its TypeScript types, so we talk to the REST API
 * directly.
 *
 * Encryption chain (org collection):
 *   masterKey  = PBKDF2-SHA256(password, email, kdfIterations, 32)
 *   stretchKey = HKDF-Expand(masterKey, "enc"|"mac", 32 each)  → 64 bytes
 *   vaultKey   = AES-256-CBC-decrypt(profile.key, stretchKey)  → 64 bytes
 *   rsaPrivKey = AES-256-CBC-decrypt(profile.privateKey, vaultKey)
 *   orgKey     = RSA-OAEP-SHA1-decrypt(org.key, rsaPrivKey)    → 64 bytes
 *   secret     = AES-256-CBC-decrypt(cipher.login.password, orgKey)
 *
 * Vault item convention:
 *   - Item type: Login
 *   - Name: the environment variable key (e.g. "NINJA_CLIENT_ID")
 *   - Password field: the secret value
 *   - Collection: VAULTWARDEN_COLLECTION_ID (org collection)
 *
 * Required env vars (bootstrap — stay in Vercel / .env.local):
 *   VAULTWARDEN_URL            https://pwd.ardepa.site
 *   VAULTWARDEN_CLIENT_ID      user.xxxxxxxx-...  (Vault → Account → API Key)
 *   VAULTWARDEN_CLIENT_SECRET  client_secret from API Key
 *   VAULTWARDEN_MASTER_PASSWORD  master password of the vault user
 *   VAULTWARDEN_COLLECTION_ID  UUID of the TUM2026 collection
 *
 * In development: if any of the above is missing, falls back to process.env[key].
 */

import {
  pbkdf2Sync,
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
  createPrivateKey,
  privateDecrypt,
  constants as cryptoConstants,
} from "crypto";

// ---------------------------------------------------------------------------
// Bitwarden crypto primitives
// ---------------------------------------------------------------------------

/** HKDF-Expand (RFC 5869 §2.3) — SHA-256, no extract step */
function hkdfExpand(prk: Buffer, info: string, length: number): Buffer {
  const hashLen = 32;
  const n = Math.ceil(length / hashLen);
  const okm = Buffer.alloc(length);
  let prev = Buffer.alloc(0);
  let offset = 0;
  for (let i = 1; i <= n; i++) {
    const hmac = createHmac("sha256", prk);
    hmac.update(prev);
    hmac.update(Buffer.from(info, "utf8"));
    hmac.update(Buffer.from([i]));
    prev = hmac.digest();
    const bytes = Math.min(hashLen, length - offset);
    prev.copy(okm, offset, 0, bytes);
    offset += bytes;
  }
  return okm;
}

interface StretchedKey {
  encKey: Buffer;
  macKey: Buffer;
}

/** Derive 32-byte master key, then HKDF-stretch to 64-byte { encKey, macKey } */
function deriveMasterKey(password: string, email: string, iterations: number): StretchedKey {
  const masterKey = pbkdf2Sync(
    Buffer.from(password, "utf8"),
    Buffer.from(email.toLowerCase(), "utf8"),
    iterations,
    32,
    "sha256",
  );
  return {
    encKey: hkdfExpand(masterKey, "enc", 32),
    macKey: hkdfExpand(masterKey, "mac", 32),
  };
}

/**
 * Decrypt a Bitwarden "2.{b64iv}|{b64ct}|{b64mac}" cipher string.
 * Verifies HMAC before decrypting (authenticated encryption).
 */
function bwDecrypt(encKey: Buffer, macKey: Buffer, cipherStr: string): Buffer {
  const parts = cipherStr.split("|");
  if (parts.length !== 3 || !parts[0].startsWith("2.")) {
    throw new Error(`Unsupported Bitwarden cipher format: ${cipherStr.slice(0, 30)}`);
  }
  const iv = Buffer.from(parts[0].slice(2), "base64");
  const ct = Buffer.from(parts[1], "base64");
  const mac = Buffer.from(parts[2], "base64");

  const hmac = createHmac("sha256", macKey);
  hmac.update(iv);
  hmac.update(ct);
  const computed = hmac.digest();
  if (computed.length !== mac.length || !timingSafeEqual(computed, mac)) {
    throw new Error("Bitwarden MAC verification failed — wrong key or tampered data");
  }
  const decipher = createDecipheriv("aes-256-cbc", encKey, iv);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/** Decrypt RSA-OAEP-SHA1 cipher "4.{b64}" using a PKCS8-DER private key */
function bwDecryptRsa(privateKeyDer: Buffer, cipherStr: string): Buffer {
  const b64 = cipherStr.startsWith("4.") ? cipherStr.slice(2) : cipherStr;
  const privKey = createPrivateKey({ key: privateKeyDer, format: "der", type: "pkcs8" });
  return privateDecrypt(
    { key: privKey, padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha1" },
    Buffer.from(b64, "base64"),
  );
}

// ---------------------------------------------------------------------------
// In-memory cache (1-hour TTL)
// ---------------------------------------------------------------------------

const cache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL = 3_600_000; // 1 hour

// ---------------------------------------------------------------------------
// Vault configuration check
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

// ---------------------------------------------------------------------------
// Vaultwarden REST API helpers
// ---------------------------------------------------------------------------

async function apiPost(url: string, body: URLSearchParams | object, bearerToken?: string): Promise<unknown> {
  const isForm = body instanceof URLSearchParams;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": isForm ? "application/x-www-form-urlencoded" : "application/json",
  };
  if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: isForm ? body.toString() : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vaultwarden ${url}: HTTP ${res.status} — ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function apiGet(url: string, bearerToken: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vaultwarden ${url}: HTTP ${res.status} — ${text.slice(0, 200)}`);
  return JSON.parse(text);
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

  const vaultUrl = process.env.VAULTWARDEN_URL!.replace(/\/$/, "");

  // 1. Authenticate via API key (client_credentials)
  const tokenBody = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "api",
    client_id: process.env.VAULTWARDEN_CLIENT_ID!,
    client_secret: process.env.VAULTWARDEN_CLIENT_SECRET!,
    DeviceIdentifier: `tum2026-${Math.random().toString(36).slice(2, 10)}`,
    DeviceType: "21",
    DeviceName: "TUM2026",
  });
  const tokenData = (await apiPost(`${vaultUrl}/identity/connect/token`, tokenBody)) as {
    access_token: string;
  };
  const accessToken = tokenData.access_token;

  // 2. Sync vault (returns encrypted ciphers + profile)
  const sync = (await apiGet(`${vaultUrl}/api/sync?excludeDomains=true`, accessToken)) as {
    profile: {
      email: string;
      key: string;
      privateKey: string;
      organizations?: Array<{ id: string; name: string; key: string }>;
    };
    ciphers?: Array<{
      name: string;
      collectionIds: string[];
      login?: { password?: string | null } | null;
    }>;
  };

  const { profile } = sync;

  // 3. Get KDF params (not included in sync response — separate prelogin endpoint)
  const prelogin = (await apiPost(`${vaultUrl}/api/accounts/prelogin`, {
    email: profile.email,
  })) as { kdfIterations: number };

  // 4. Derive master key + stretch
  const { encKey: sEncKey, macKey: sMacKey } = deriveMasterKey(
    process.env.VAULTWARDEN_MASTER_PASSWORD!,
    profile.email,
    prelogin.kdfIterations,
  );

  // 5. Decrypt personal vault key
  const vaultKeyBytes = bwDecrypt(sEncKey, sMacKey, profile.key);
  const vaultEncKey = vaultKeyBytes.slice(0, 32);
  const vaultMacKey = vaultKeyBytes.slice(32, 64);

  // 6. Decrypt RSA private key
  const privateKeyDer = bwDecrypt(vaultEncKey, vaultMacKey, profile.privateKey);

  // 7. Find org membership and decrypt org key
  const collectionId = process.env.VAULTWARDEN_COLLECTION_ID!;
  const orgMembership = profile.organizations?.find((o) => {
    // Accept any org that has an encrypted key (assume it owns the collection)
    return o.key?.length > 0;
  });
  if (!orgMembership) {
    throw new Error("[secrets] No org membership found in Vaultwarden profile");
  }

  const orgKeyBytes = bwDecryptRsa(privateKeyDer, orgMembership.key);
  const orgEncKey = orgKeyBytes.slice(0, 32);
  const orgMacKey = orgKeyBytes.slice(32, 64);

  // 8. Decrypt all Login items in the collection
  const result: Record<string, string> = {};
  const expiresAt = Date.now() + CACHE_TTL;

  for (const cipher of sync.ciphers ?? []) {
    if (!cipher.collectionIds?.includes(collectionId)) continue;
    if (!cipher.login?.password) continue;

    try {
      const name = bwDecrypt(orgEncKey, orgMacKey, cipher.name).toString("utf8");
      const value = bwDecrypt(orgEncKey, orgMacKey, cipher.login.password).toString("utf8");
      result[name] = value;
      cache.set(name, { value, expiresAt });
    } catch {
      // Skip ciphers we can't decrypt (owned by different org, different key, etc.)
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

  // Dev fallback — no Vaultwarden configured
  if (!isConfigured()) {
    const fallback = process.env[key];
    if (fallback) return fallback;
    throw new Error(`[secrets] "${key}" not found. Configure Vaultwarden or set ${key} in .env.local`);
  }

  // Cache miss (after 1 hr) — re-sync to refresh all at once
  const all = await getAllSecrets();
  if (key in all) return all[key];

  // Last resort: env fallback in development
  if (process.env.NODE_ENV === "development" && process.env[key]) {
    return process.env[key]!;
  }

  throw new Error(`[secrets] "${key}" not found in Vaultwarden collection`);
}

/** Clear in-memory cache — forces re-fetch on next access. */
export function clearSecretCache(): void {
  cache.clear();
}
