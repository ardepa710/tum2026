import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { initSecrets, getSecret, clearSecretCache } from '@/lib/secrets';

describe('SecretsManager', () => {
  beforeAll(async () => {
    // Ensure Vaultwarden env vars are set
    if (!process.env.VAULTWARDEN_URL) {
      throw new Error('VAULTWARDEN_URL not set');
    }
    await initSecrets();
  });

  afterAll(() => {
    clearSecretCache();
  });

  it('retrieves secret from Vaultwarden', async () => {
    const secret = await getSecret('AUTH_SECRET');

    expect(secret).toBeTruthy();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(20);
  });

  it('caches secret for 1 hour', async () => {
    const start = Date.now();
    const first = await getSecret('AUTH_SECRET');
    const firstDuration = Date.now() - start;

    const start2 = Date.now();
    const second = await getSecret('AUTH_SECRET');
    const secondDuration = Date.now() - start2;

    expect(first).toBe(second);
    // Second call should be instant (< 10ms from cache)
    expect(secondDuration).toBeLessThan(10);
    expect(secondDuration).toBeLessThan(firstDuration);
  });

  it('throws error if secret not found', async () => {
    await expect(
      getSecret('NON_EXISTENT_SECRET_12345')
    ).rejects.toThrow('Failed to retrieve secret');
  });

  it('falls back to env var in development', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    process.env.TEST_SECRET_FALLBACK = 'fallback_value';

    // Mock Vaultwarden failure by using non-existent secret
    // In dev mode, should fall back to env var
    const secret = await getSecret('TEST_SECRET_FALLBACK');

    expect(secret).toBe('fallback_value');

    process.env.NODE_ENV = originalEnv;
    delete process.env.TEST_SECRET_FALLBACK;
  });
});
