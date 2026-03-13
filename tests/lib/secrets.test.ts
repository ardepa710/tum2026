import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { getAllSecrets, getSecret, clearSecretCache } from '@/lib/secrets';

describe('SecretsManager', () => {
  beforeAll(async () => {
    if (!process.env.VAULTWARDEN_URL) {
      throw new Error('VAULTWARDEN_URL not set');
    }
    // Pre-load all secrets into cache (single auth+sync)
    await getAllSecrets();
  });

  afterAll(() => {
    clearSecretCache();
  });

  it('retrieves secret from Vaultwarden', async () => {
    const secret = await getSecret('AUTH_MICROSOFT_ENTRA_ID_SECRET');

    expect(secret).toBeTruthy();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(10);
  });

  it('returns cached value on second call (< 10ms)', async () => {
    const first = await getSecret('AUTH_MICROSOFT_ENTRA_ID_SECRET');

    const start = Date.now();
    const second = await getSecret('AUTH_MICROSOFT_ENTRA_ID_SECRET');
    const duration = Date.now() - start;

    expect(first).toBe(second);
    expect(duration).toBeLessThan(10);
  });

  it('throws error if secret not found in collection', async () => {
    await expect(
      getSecret('NON_EXISTENT_SECRET_12345')
    ).rejects.toThrow();
  });

  it('falls back to process.env in development when Vaultwarden not configured', async () => {
    clearSecretCache();
    const originalUrl = process.env.VAULTWARDEN_URL;
    delete process.env.VAULTWARDEN_URL;

    process.env.TEST_SECRET_FALLBACK = 'fallback_value';
    const secret = await getSecret('TEST_SECRET_FALLBACK');
    expect(secret).toBe('fallback_value');

    process.env.VAULTWARDEN_URL = originalUrl;
    delete process.env.TEST_SECRET_FALLBACK;
    clearSecretCache();
  });
});
