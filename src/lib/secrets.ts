/**
 * Secrets Manager - Secure secrets retrieval from Vaultwarden
 *
 * This module provides a centralized interface to retrieve secrets from
 * Vaultwarden (self-hosted Bitwarden) using the Bitwarden SDK.
 *
 * Features:
 * - Singleton pattern for global client instance
 * - 1-hour in-memory cache to minimize API calls
 * - Automatic fallback to environment variables in development
 * - Type-safe secret retrieval
 *
 * Usage:
 *   import { getSecret } from '@/lib/secrets';
 *   const authSecret = await getSecret('AUTH_SECRET');
 *
 * @see /docs/security/vaultwarden-setup.md
 */

import {
  BitwardenClient,
  ClientSettings,
  DeviceType,
  LogLevel,
} from '@bitwarden/sdk-napi';

interface SecretCache {
  value: string;
  expiresAt: number;
}

class SecretsManager {
  private cache = new Map<string, SecretCache>();
  private client: BitwardenClient | null = null;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds
  private authenticated = false;

  async authenticate(): Promise<void> {
    if (this.authenticated && this.client) {
      return; // Already authenticated
    }

    const vaultwardenUrl = process.env.VAULTWARDEN_URL;
    const accessToken = process.env.VAULTWARDEN_ACCESS_TOKEN;

    if (!vaultwardenUrl || !accessToken) {
      throw new Error(
        'Vaultwarden credentials not configured. Set VAULTWARDEN_URL and VAULTWARDEN_ACCESS_TOKEN in environment variables.'
      );
    }

    // Initialize Bitwarden client with Vaultwarden URL
    const settings: ClientSettings = {
      apiUrl: vaultwardenUrl,
      identityUrl: vaultwardenUrl,
      deviceType: DeviceType.SDK,
      userAgent: 'TUM2026',
    };

    this.client = new BitwardenClient(settings, LogLevel.Info);

    // Authenticate with access token
    // Note: Vaultwarden doesn't require a state file path for service account tokens
    await this.client.auth().loginAccessToken(accessToken, null);

    this.authenticated = true;

    console.log('[SECRETS] Successfully authenticated with Vaultwarden');
  }

  async getSecret(key: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Try to fetch from Vaultwarden
    try {
      if (!this.authenticated || !this.client) {
        await this.authenticate();
      }

      // List all secrets and find the one we want by name
      // The Bitwarden SDK returns secrets with IDs, but we need to search by name
      const secretsResponse = await this.client!.secrets().list(null);

      if (!secretsResponse || !secretsResponse.data) {
        throw new Error('No secrets returned from Vaultwarden');
      }

      // Find secret by key (name)
      const secretItem = secretsResponse.data.find(
        (item: any) => item.key === key
      );

      if (!secretItem) {
        throw new Error(`Secret not found in Vaultwarden: ${key}`);
      }

      // Get the full secret details
      const secretDetails = await this.client!.secrets().get(secretItem.id);

      if (!secretDetails || !secretDetails.value) {
        throw new Error(`Secret value is empty for: ${key}`);
      }

      const secretValue = secretDetails.value;

      // Cache for 1 hour
      this.cache.set(key, {
        value: secretValue,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      console.log(`[SECRETS] Retrieved and cached secret: ${key}`);

      return secretValue;
    } catch (error) {
      console.error(`[SECRETS] Failed to retrieve secret "${key}":`, error);

      // Fallback to env vars in development only
      if (process.env.NODE_ENV === 'development') {
        const fallback = process.env[key];
        if (fallback) {
          console.warn(`[SECRETS] Using fallback env var for ${key}`);
          return fallback;
        }
      }

      throw new Error(
        `Failed to retrieve secret: ${key}. ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getAllSecrets(): Promise<Record<string, string>> {
    if (!this.authenticated || !this.client) {
      await this.authenticate();
    }

    const secretsResponse = await this.client!.secrets().list(null);

    if (!secretsResponse || !secretsResponse.data) {
      throw new Error('No secrets returned from Vaultwarden');
    }

    const result: Record<string, string> = {};

    // Fetch full details for each secret
    for (const item of secretsResponse.data) {
      const secretDetails = await this.client!.secrets().get(item.id);
      if (secretDetails && secretDetails.key && secretDetails.value) {
        result[secretDetails.key] = secretDetails.value;
      }
    }

    return result;
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[SECRETS] Cache cleared');
  }

  disconnect(): void {
    if (this.client) {
      // The SDK doesn't have an explicit disconnect method
      // Just clear the reference
      this.client = null;
      this.authenticated = false;
      console.log('[SECRETS] Disconnected from Vaultwarden');
    }
  }
}

// Singleton instance
let secretsManager: SecretsManager | null = null;

/**
 * Initialize the secrets manager
 * Must be called before using getSecret() or getAllSecrets()
 */
export async function initSecrets(): Promise<void> {
  if (!secretsManager) {
    secretsManager = new SecretsManager();
    await secretsManager.authenticate();
  }
}

/**
 * Retrieve a single secret from Vaultwarden
 * Automatically initializes the manager if not already done
 * Caches results for 1 hour
 *
 * @param key - The secret name (e.g., 'AUTH_SECRET')
 * @returns The secret value
 * @throws Error if secret not found or authentication fails
 */
export async function getSecret(key: string): Promise<string> {
  if (!secretsManager) {
    await initSecrets();
  }
  return secretsManager!.getSecret(key);
}

/**
 * Retrieve all secrets from Vaultwarden
 * Useful for bulk loading at application startup
 *
 * @returns Object mapping secret names to values
 */
export async function getAllSecrets(): Promise<Record<string, string>> {
  if (!secretsManager) {
    await initSecrets();
  }
  return secretsManager!.getAllSecrets();
}

/**
 * Clear the in-memory secret cache
 * Forces fresh retrieval from Vaultwarden on next access
 */
export function clearSecretCache(): void {
  if (secretsManager) {
    secretsManager.clearCache();
  }
}

/**
 * Disconnect from Vaultwarden
 * Clears the client instance and cache
 */
export function disconnectSecrets(): void {
  if (secretsManager) {
    secretsManager.disconnect();
    secretsManager.clearCache();
    secretsManager = null;
  }
}
