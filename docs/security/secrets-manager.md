# Secrets Manager - Implementation Guide

**Status:** Implemented
**Last Updated:** 2026-02-24
**Owner:** Security Team

## Overview

The Secrets Manager provides a secure, centralized interface for retrieving application secrets from Vaultwarden (self-hosted Bitwarden) at runtime. This replaces hardcoded `.env` values and achieves SOC2 compliance for secrets management.

## Architecture

```
┌─────────────────────┐
│   TUM2026 App       │
│                     │
│  ┌───────────────┐  │      HTTPS
│  │ SecretsManager│──┼──────────────┐
│  │   (Singleton) │  │              │
│  └───────┬───────┘  │              │
│          │          │              │
│    ┌─────▼──────┐   │              │
│    │  1hr Cache │   │              │
│    └────────────┘   │              │
└─────────────────────┘              │
                                     │
                          ┌──────────▼─────────┐
                          │   Vaultwarden      │
                          │   (Self-hosted)    │
                          │                    │
                          │ ┌────────────────┐ │
                          │ │ TUM2026 Org    │ │
                          │ │                │ │
                          │ │ - Production   │ │
                          │ │   Secrets      │ │
                          │ │ - Development  │ │
                          │ │   Secrets      │ │
                          │ └────────────────┘ │
                          └────────────────────┘
```

## Key Features

1. **Singleton Pattern**: Single global client instance per application
2. **1-Hour Caching**: Reduces API calls and improves performance
3. **Automatic Fallback**: Falls back to env vars in development mode
4. **Type-Safe**: Full TypeScript support with type inference
5. **Error Handling**: Comprehensive error messages for debugging

## Installation

The Secrets Manager uses the Bitwarden SDK for Node.js:

```bash
npm install @bitwarden/sdk-napi
```

## Configuration

### Environment Variables

Create a `.env.test` file for running tests (copy from `.env.test.example`):

```bash
# Vaultwarden Configuration
VAULTWARDEN_URL=https://your-vaultwarden-instance.com
VAULTWARDEN_ACCESS_TOKEN=your-service-account-access-token

# Node Environment
NODE_ENV=test
```

For production, add to `.env.local`:

```bash
VAULTWARDEN_URL=https://vault.yourdomain.com
VAULTWARDEN_ACCESS_TOKEN=<service-account-token-from-vaultwarden>
```

### Getting the Access Token

1. Log in to your Vaultwarden web vault
2. Navigate to: Organizations → TUM2026 → Service Accounts
3. Select the "TUM2026-App" service account
4. Click "Generate Access Token"
5. Copy the token (it will only be shown once)
6. Add to `.env.local` as `VAULTWARDEN_ACCESS_TOKEN`

## Usage

### Basic Usage

```typescript
import { getSecret } from '@/lib/secrets';

// Retrieve a single secret
const authSecret = await getSecret('AUTH_SECRET');
const dbUrl = await getSecret('DATABASE_URL');
```

### Bulk Loading

```typescript
import { getAllSecrets } from '@/lib/secrets';

// Load all secrets at once (useful for startup)
const secrets = await getAllSecrets();
console.log(secrets.AUTH_SECRET);
console.log(secrets.DATABASE_URL);
```

### Manual Initialization

The manager auto-initializes on first use, but you can manually initialize:

```typescript
import { initSecrets } from '@/lib/secrets';

// Initialize at application startup
await initSecrets();

// Then use getSecret() anywhere
const secret = await getSecret('AUTH_SECRET');
```

### Cache Management

```typescript
import { clearSecretCache } from '@/lib/secrets';

// Clear cache to force fresh fetch
clearSecretCache();

// Next call will fetch from Vaultwarden
const secret = await getSecret('AUTH_SECRET');
```

### Cleanup

```typescript
import { disconnectSecrets } from '@/lib/secrets';

// Disconnect and cleanup (useful for tests)
disconnectSecrets();
```

## Integration with Next.js

### Server Components

```typescript
// app/dashboard/page.tsx
import { getSecret } from '@/lib/secrets';

export default async function DashboardPage() {
  const graphClientId = await getSecret('GRAPH_CLIENT_ID');

  // Use the secret...
  return <div>Dashboard</div>;
}
```

### API Routes

```typescript
// app/api/auth/[...nextauth]/route.ts
import { getSecret } from '@/lib/secrets';

const authSecret = await getSecret('AUTH_SECRET');

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  // ...
});
```

### Server Actions

```typescript
'use server';

import { getSecret } from '@/lib/secrets';

export async function fetchData() {
  const apiKey = await getSecret('NINJA_CLIENT_SECRET');
  // Use the API key...
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run secrets tests specifically
npm test tests/lib/secrets.test.ts

# Watch mode
npm run test:watch
```

### Test Requirements

Before running tests, you must:

1. Have a running Vaultwarden instance
2. Create a `.env.test` file with credentials
3. Have at least one secret named "AUTH_SECRET" in Vaultwarden

### Test Coverage

The test suite includes:

1. **Authentication Test**: Verifies connection to Vaultwarden
2. **Secret Retrieval Test**: Fetches a real secret and validates format
3. **Caching Test**: Confirms 1-hour cache works and is fast
4. **Error Handling Test**: Tests non-existent secret handling
5. **Fallback Test**: Validates development mode fallback to env vars

## Security Considerations

### Access Token Security

- **Never commit** the access token to version control
- Store only in `.env.local` or `.env.test` (both in `.gitignore`)
- Rotate access token every 90 days
- Use service account with **read-only** permissions

### Fallback Behavior

In **development mode only** (`NODE_ENV=development`), the manager falls back to environment variables if:
- Vaultwarden is unreachable
- Secret doesn't exist in Vaultwarden
- Authentication fails

This allows local development without Vaultwarden access.

In **production**, fallback is disabled. All secrets must come from Vaultwarden.

### Cache Expiration

Secrets are cached in memory for 1 hour to reduce API calls. This means:
- Secret changes in Vaultwarden take up to 1 hour to propagate
- For immediate updates, restart the application or call `clearSecretCache()`

## Troubleshooting

### Error: "VAULTWARDEN_URL not set"

**Cause**: Environment variables not configured

**Solution**:
1. Create `.env.test` (for tests) or update `.env.local` (for development)
2. Add `VAULTWARDEN_URL` and `VAULTWARDEN_ACCESS_TOKEN`
3. Restart the application or test runner

### Error: "Secret not found in Vaultwarden"

**Cause**: The requested secret doesn't exist in Vaultwarden

**Solution**:
1. Log in to Vaultwarden web vault
2. Navigate to TUM2026 organization
3. Verify the secret exists with the exact name (case-sensitive)
4. Ensure the service account has read access to the collection

### Error: "Failed to authenticate with Vaultwarden"

**Cause**: Invalid access token or network issues

**Solution**:
1. Verify `VAULTWARDEN_URL` is correct and accessible
2. Regenerate access token in Vaultwarden
3. Update `.env.local` with new token
4. Check network connectivity to Vaultwarden server
5. Verify HTTPS is enabled (required for Vaultwarden)

### Slow Secret Retrieval

**Cause**: Cache miss or first fetch

**Solution**:
- First fetch is always slow (network call to Vaultwarden)
- Subsequent fetches are instant (< 10ms from cache)
- Consider bulk loading secrets at startup with `getAllSecrets()`

## Migration Guide

### Migrating from Environment Variables

**Before** (using `.env.local`):

```typescript
const authSecret = process.env.AUTH_SECRET;
```

**After** (using Secrets Manager):

```typescript
import { getSecret } from '@/lib/secrets';

const authSecret = await getSecret('AUTH_SECRET');
```

### Step-by-Step Migration

1. **Identify all secrets** currently in `.env.local`
2. **Add secrets to Vaultwarden** (see `/docs/security/vaultwarden-setup.md`)
3. **Update code** to use `getSecret()` instead of `process.env`
4. **Test thoroughly** in development
5. **Keep `.env.local` as fallback** (development mode only)
6. **Deploy to production** with Vaultwarden credentials

### Gradual Migration

You can migrate incrementally:

```typescript
// Hybrid approach during migration
const authSecret = process.env.VAULTWARDEN_URL
  ? await getSecret('AUTH_SECRET')  // Use Vaultwarden if configured
  : process.env.AUTH_SECRET;         // Fallback to env var
```

## Performance Metrics

Based on testing with Vaultwarden on VPS:

| Operation | First Call | Cached Call | Notes |
|-----------|------------|-------------|-------|
| `getSecret()` | ~200-500ms | < 10ms | Network latency varies |
| `getAllSecrets()` | ~1-3s | N/A | Depends on secret count |
| `initSecrets()` | ~100-300ms | N/A | One-time authentication |

## API Reference

### `initSecrets(): Promise<void>`

Manually initialize the secrets manager. Auto-called on first `getSecret()` use.

```typescript
await initSecrets();
```

### `getSecret(key: string): Promise<string>`

Retrieve a single secret by name. Returns cached value if available.

```typescript
const secret = await getSecret('AUTH_SECRET');
```

**Parameters:**
- `key`: Secret name (case-sensitive, matches Vaultwarden item name)

**Returns:** Secret value as string

**Throws:** Error if secret not found or authentication fails

### `getAllSecrets(): Promise<Record<string, string>>`

Retrieve all secrets from Vaultwarden as an object.

```typescript
const secrets = await getAllSecrets();
```

**Returns:** Object mapping secret names to values

### `clearSecretCache(): void`

Clear the in-memory cache. Next `getSecret()` call will fetch from Vaultwarden.

```typescript
clearSecretCache();
```

### `disconnectSecrets(): void`

Disconnect from Vaultwarden and clear cache. Useful for cleanup in tests.

```typescript
disconnectSecrets();
```

## Next Steps

1. ✅ Secrets Manager implemented
2. ⏭️ Migrate existing secrets to Vaultwarden (Task 1.4)
3. ⏭️ Update application code to use `getSecret()` (Task 1.5)
4. ⏭️ Test in development environment (Task 1.6)
5. ⏭️ Deploy to production with Vaultwarden credentials (Task 1.7)

## References

- [Vaultwarden Setup Guide](/docs/security/vaultwarden-setup.md)
- [Bitwarden SDK Documentation](https://bitwarden.com/help/secrets-manager-sdk/)
- [SOC2 Implementation Plan](/docs/plans/2026-02-24-soc2-implementation.md)
