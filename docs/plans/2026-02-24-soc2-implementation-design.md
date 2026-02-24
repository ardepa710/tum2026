# SOC2 Compliance Implementation - Design Document

**Project:** TUM2026 Multi-tenant IT Admin Dashboard
**Date:** February 24, 2026
**Author:** Andrés De Paula (with Claude Sonnet 4.5)
**Status:** Approved - Ready for Implementation

---

## Executive Summary

This document outlines the design for implementing SOC2 compliance controls in TUM2026. The implementation follows a **Sequential + Incremental** approach over 12 weeks (~3 months) with 10-20 hours/week of development effort.

### Goals

- **Primary:** Improve security posture using SOC2 as framework (no formal audit required)
- **Secondary:** Document controls for customer/investor due diligence
- **Timeline:** Flexible 3-4 months
- **Resources:** Part-time development (10-20 hrs/week) + Vaultwarden (available)

### Current State

Based on compliance analysis (TUM2026_Compliance_Report.pdf):
- **SOC2 Score:** 40% compliant
- **Critical Gaps:** Hardcoded secrets (CVSS 9.8), no encryption at rest, fire-and-forget audit logging
- **Strong Foundation:** Microsoft SSO, RBAC, HTTPS, audit logging infrastructure

### Target State

After implementation:
- **SOC2 Score:** 75-80% compliant (sufficient for due diligence)
- **4 Critical Controls:** Secrets management, encryption at rest, reliable audit logging, input validation
- **Documentation:** 8 security policy documents + 2 architecture diagrams
- **Testing:** 100% coverage of critical paths

### Investment

- **Technical Implementation:** 147 hours
  - Secrets Management: 24 hrs
  - Encryption at Rest: 8 hrs
  - Reliable Audit Logging: 24 hrs
  - Input Validation: 40 hrs
  - Testing: 19 hrs
  - Documentation: 20 hrs
  - Buffer: 12 hrs

- **Timeline:** 12 weeks at 15 hrs/week average
- **Cost:** $0 infrastructure (Vaultwarden already available, Neon.tech has encryption)

---

## 1. Architecture Overview

### 1.1 Layered Security Model

The SOC2 implementation uses a **defense-in-depth** strategy with 4 sequential layers:

```
┌─────────────────────────────────────────────────┐
│ Layer 4: INPUT VALIDATION (Zod)                │
│ - Request validation at API boundaries          │
│ - Type-safe schemas for all endpoints           │
│ - Prevents injection attacks                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Layer 3: RELIABLE AUDIT LOGGING                │
│ - Transactional logging (no silent failures)    │
│ - Retention policy (7 yrs critical, 2 yrs std)  │
│ - Tamper-resistant audit trail                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Layer 2: ENCRYPTION AT REST                    │
│ - Neon.tech database TDE (AES-256)             │
│ - Protects PII/PHI even if DB compromised       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Layer 1: SECRETS MANAGEMENT (Vaultwarden)      │
│ - All API keys, tokens in vault                 │
│ - Runtime: App reads from Vaultwarden API       │
│ - Build time: Vercel reads via CLI              │
│ - Zero secrets in code or .env files            │
└─────────────────────────────────────────────────┘
```

### 1.2 Integration Points

**No breaking changes** to business logic. Changes are localized to:

- `src/lib/secrets.ts` - New secrets client
- `src/lib/audit-v2.ts` - Improved audit logging
- `src/lib/validation/` - Zod schemas (new directory)
- `src/lib/validate.ts` - Validation middleware (new)
- API routes - Add validation layer
- Server actions - Add validation to form handlers

### 1.3 Design Principles

1. **Defense in Depth:** Multiple security layers, not single point of failure
2. **Fail Secure:** If component fails, system closes rather than exposing data
3. **Auditability:** All changes and access are traceable
4. **Zero Trust:** Never trust, always verify
5. **Least Privilege:** Users/services have minimum required permissions

---

## 2. Phase 1: Secrets Management (Vaultwarden)

**Timeline:** Weeks 1-3 (24 hours)
**Priority:** CRITICAL (CVSS 9.8 - Hardcoded secrets in .env.local)

### 2.1 Current State Problems

```bash
# .env.local (CURRENT - INSECURE)
AUTH_MICROSOFT_ENTRA_ID_SECRET="REDACTED_AUTH_SECRET"
GRAPH_CLIENT_SECRET="REDACTED_GRAPH_SECRET"
NINJA_CLIENT_SECRET="PxFXXFVY4c5cLphz3dWPAOTN3dM_q75fmYwsXhb-0hFk7NmynP01IQ"
SOPHOS_CLIENT_SECRET="92bbab1e93542b255b02ef63077d573bc003b9d2..."
```

**Risks:**
- Secrets in plaintext
- Potentially in git history (even if .gitignored now)
- No rotation tracking
- Shared across dev/staging/production

### 2.2 Target Architecture

```
┌─────────────────────────────────────────────────┐
│ Development Environment (Local)                 │
│                                                 │
│  Next.js App ──> getSecret() ──> Vaultwarden   │
│                                     API         │
│  .env.local: Only VAULTWARDEN_URL/credentials   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Production Environment (Vercel)                 │
│                                                 │
│  Build Time: bw sync ──────> Vaultwarden CLI   │
│  Runtime: getSecret() ──────> Vaultwarden API  │
│                                                 │
│  Vercel Env Vars: Only VAULTWARDEN_* config     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Vaultwarden Server (Self-hosted)               │
│                                                 │
│  Organization: TUM2026                          │
│  Collection: Production Secrets                 │
│  Items: ~15 secrets                             │
│    - AUTH_SECRET                                │
│    - AUTH_MICROSOFT_ENTRA_ID_* (3)              │
│    - GRAPH_CLIENT_* (2)                         │
│    - NINJA_CLIENT_* (2)                         │
│    - SOPHOS_CLIENT_* (2)                        │
│    - DATABASE_URL (dev + prod)                  │
└─────────────────────────────────────────────────┘
```

### 2.3 Implementation Details

#### Step 1: Prepare Vaultwarden (2 hours)

1. **Create Organization Structure**
   ```bash
   # In Vaultwarden web UI
   1. Create organization: "TUM2026"
   2. Create collection: "Production Secrets"
   3. Create collection: "Development Secrets"
   ```

2. **Migrate Secrets**
   - Create 15 secure items in Vaultwarden
   - Use custom fields for structured data
   - Add notes for secret rotation dates
   - Set up access controls (who can read/write)

3. **Generate API Credentials**
   - Create service account for app access
   - Generate API key for Vercel builds
   - Store bootstrap credentials securely

#### Step 2: Create Secrets SDK (8 hours)

**New file: `src/lib/secrets.ts`**

```typescript
import { createClient } from '@bitwarden/sdk-js';

interface SecretCache {
  value: string;
  expiresAt: number;
}

class SecretsManager {
  private cache = new Map<string, SecretCache>();
  private client: BitwardenClient;
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor() {
    this.client = createClient({
      apiUrl: process.env.VAULTWARDEN_URL!,
      identityUrl: process.env.VAULTWARDEN_URL!,
    });
  }

  async authenticate(): Promise<void> {
    await this.client.auth.login({
      apiKey: process.env.VAULTWARDEN_CLIENT_ID!,
      apiSecret: process.env.VAULTWARDEN_CLIENT_SECRET!,
    });
  }

  async getSecret(key: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Fetch from Vaultwarden
    try {
      const secret = await this.client.secrets.get(key);

      // Cache for 1 hour
      this.cache.set(key, {
        value: secret.value,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      return secret.value;
    } catch (error) {
      // Fallback to env vars in development only
      if (process.env.NODE_ENV === 'development') {
        const fallback = process.env[key];
        if (fallback) {
          console.warn(`Using fallback env var for ${key}`);
          return fallback;
        }
      }
      throw new Error(`Failed to retrieve secret: ${key}`);
    }
  }

  async getAllSecrets(): Promise<Record<string, string>> {
    // For build-time use (Vercel)
    const secrets = await this.client.secrets.list();
    const result: Record<string, string> = {};

    for (const secret of secrets) {
      result[secret.key] = secret.value;
    }

    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
let secretsManager: SecretsManager | null = null;

export async function initSecrets(): Promise<void> {
  if (!secretsManager) {
    secretsManager = new SecretsManager();
    await secretsManager.authenticate();
  }
}

export async function getSecret(key: string): Promise<string> {
  if (!secretsManager) {
    await initSecrets();
  }
  return secretsManager!.getSecret(key);
}
```

#### Step 3: Migrate Application Code (10 hours)

**Files to update:**

1. **`src/lib/auth.ts`** - NextAuth configuration
   ```typescript
   // BEFORE
   clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,

   // AFTER
   clientSecret: await getSecret('AUTH_MICROSOFT_ENTRA_ID_SECRET'),
   ```

2. **`src/lib/graph.ts`** - Microsoft Graph API client
   ```typescript
   // Update token fetching
   const GRAPH_CLIENT_ID = await getSecret('GRAPH_CLIENT_ID');
   const GRAPH_CLIENT_SECRET = await getSecret('GRAPH_CLIENT_SECRET');
   ```

3. **`src/lib/ninja.ts`** - NinjaOne RMM client
   ```typescript
   const NINJA_CLIENT_ID = await getSecret('NINJA_CLIENT_ID');
   const NINJA_CLIENT_SECRET = await getSecret('NINJA_CLIENT_SECRET');
   ```

4. **`src/lib/sophos.ts`** - Sophos Central client
   ```typescript
   const SOPHOS_CLIENT_ID = await getSecret('SOPHOS_CLIENT_ID');
   const SOPHOS_CLIENT_SECRET = await getSecret('SOPHOS_CLIENT_SECRET');
   ```

5. **`prisma.config.ts`** - Database connection
   ```typescript
   databaseUrl: await getSecret('DATABASE_URL'),
   ```

**Challenge: NextAuth Synchronous Requirements**

NextAuth expects synchronous config. Solution: **Initialization Pattern**

```typescript
// src/lib/auth-init.ts
let authConfig: NextAuthConfig | null = null;

export async function initAuth(): Promise<NextAuthConfig> {
  if (authConfig) return authConfig;

  authConfig = {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    providers: [
      MicrosoftEntraId({
        clientId: await getSecret('AUTH_MICROSOFT_ENTRA_ID_ID'),
        clientSecret: await getSecret('AUTH_MICROSOFT_ENTRA_ID_SECRET'),
        issuer: `https://login.microsoftonline.com/${await getSecret('AUTH_MICROSOFT_ENTRA_ID_TENANT_ID')}/v2.0`,
      }),
    ],
    // ... rest of config
  };

  return authConfig;
}

// src/lib/auth.ts
import { initAuth } from './auth-init';

const configPromise = initAuth();

export const { handlers, auth, signIn, signOut } = NextAuth(await configPromise);
```

#### Step 4: Vercel Integration (4 hours)

**Option A: Manual Sync Script**

```bash
#!/bin/bash
# scripts/sync-secrets-to-vercel.sh

set -e

echo "Logging in to Vaultwarden..."
bw config server $VAULTWARDEN_URL
echo $VAULTWARDEN_PASSWORD | bw unlock --raw

echo "Syncing secrets to Vercel..."
SECRETS=$(bw list items --organizationid $ORG_ID --collectionid $COLLECTION_ID)

for secret in $(echo $SECRETS | jq -r '.[] | @base64'); do
  KEY=$(echo $secret | base64 --decode | jq -r '.name')
  VALUE=$(echo $secret | base64 --decode | jq -r '.login.password')

  printf "$VALUE" | vercel env add $KEY production --force
  printf "$VALUE" | vercel env add $KEY preview --force
done

echo "Secrets synced successfully!"
```

**Option B: GitHub Actions (Automated)**

```yaml
# .github/workflows/sync-secrets.yml
name: Sync Secrets to Vercel

on:
  workflow_dispatch:
  schedule:
    - cron: '0 0 1 * *' # Monthly

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Bitwarden CLI
        run: npm install -g @bitwarden/cli

      - name: Sync secrets
        env:
          VAULTWARDEN_URL: ${{ secrets.VAULTWARDEN_URL }}
          VAULTWARDEN_CLIENT_ID: ${{ secrets.VAULTWARDEN_CLIENT_ID }}
          VAULTWARDEN_CLIENT_SECRET: ${{ secrets.VAULTWARDEN_CLIENT_SECRET }}
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: ./scripts/sync-secrets-to-vercel.sh
```

**Vercel Build Configuration**

Update `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "vercel-build": "bw sync && npm run build"
  }
}
```

### 2.4 Secrets Rotation Plan

**CRITICAL:** Rotate all secrets BEFORE production deployment.

**Rotation Process:**

1. **Azure Portal**
   - Navigate to App Registration → Certificates & secrets
   - Generate new client secret
   - Copy to Vaultwarden immediately
   - Delete old secret after verification

2. **Microsoft Graph API**
   - Same process as Azure

3. **NinjaOne**
   - API Applications → Generate new API key
   - Update Vaultwarden
   - Revoke old key

4. **Sophos Central**
   - Partner Portal → API Credentials
   - Generate new client secret
   - Update Vaultwarden

5. **AUTH_SECRET**
   ```bash
   openssl rand -base64 32 > /tmp/new_auth_secret
   # Copy to Vaultwarden
   ```

6. **Database Credentials**
   - Neon.tech → Settings → Reset password
   - Update connection string in Vaultwarden

**Rotation Schedule (Post-Implementation):**
- Critical secrets (AUTH_SECRET, DB): Every 90 days
- API keys: Every 180 days
- Service accounts: Every 365 days

### 2.5 Configuration: Dev vs. Production

**Development (.env.local)**
```bash
# After Vaultwarden migration
VAULTWARDEN_URL=https://vault.yourdomain.com
VAULTWARDEN_CLIENT_ID=xxx
VAULTWARDEN_CLIENT_SECRET=xxx
NODE_ENV=development

# Fallback env vars ONLY in dev (removed after testing)
# These are used if Vaultwarden is unreachable
AUTH_SECRET=fallback_value
# ... etc
```

**Production (Vercel Environment Variables)**
```bash
VAULTWARDEN_URL=https://vault.yourdomain.com
VAULTWARDEN_CLIENT_ID=xxx
VAULTWARDEN_CLIENT_SECRET=xxx
NODE_ENV=production

# NO fallback secrets in production
```

### 2.6 Testing Strategy

**Unit Tests:**
```typescript
// tests/lib/secrets.test.ts
describe('SecretsManager', () => {
  beforeEach(async () => {
    await initSecrets();
  });

  it('retrieves secret from Vaultwarden', async () => {
    const secret = await getSecret('AUTH_SECRET');
    expect(secret).toBeTruthy();
    expect(secret.length).toBeGreaterThan(20);
  });

  it('caches secret for 1 hour', async () => {
    const start = Date.now();
    await getSecret('AUTH_SECRET');
    const firstDuration = Date.now() - start;

    const start2 = Date.now();
    await getSecret('AUTH_SECRET');
    const secondDuration = Date.now() - start2;

    // Second call should be instant (< 10ms)
    expect(secondDuration).toBeLessThan(10);
    expect(secondDuration).toBeLessThan(firstDuration);
  });

  it('throws error if secret not found', async () => {
    await expect(getSecret('NON_EXISTENT_SECRET')).rejects.toThrow();
  });

  it('falls back to env var in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TEST_SECRET = 'fallback_value';

    // Mock Vaultwarden failure
    const secret = await getSecret('TEST_SECRET');
    expect(secret).toBe('fallback_value');
  });
});
```

**Integration Tests:**

1. **Local Development:**
   ```bash
   npm run dev
   # Verify app starts and connects to:
   # - PostgreSQL
   # - Microsoft Graph API
   # - NinjaOne API
   # - Sophos API
   ```

2. **Authentication Flow:**
   ```bash
   # Navigate to /login
   # Click "Sign in with Microsoft"
   # Verify successful authentication
   # Check that session is created
   ```

3. **API Endpoints:**
   ```bash
   # Test each integration
   curl http://localhost:3000/api/tenants/1/users
   curl http://localhost:3000/api/ninja/devices
   curl http://localhost:3000/api/sophos/endpoints
   ```

4. **Vercel Preview:**
   ```bash
   vercel deploy --preview
   # Test on preview URL
   # Verify all integrations work
   ```

**Pre-Commit Checklist:**

- [ ] All 15 secrets migrated to Vaultwarden
- [ ] `.env.local` contains ONLY Vaultwarden credentials
- [ ] `.gitignore` includes `.env.local` (verify with `git status`)
- [ ] App starts successfully in local dev
- [ ] All integrations (Graph, Ninja, Sophos) work
- [ ] Vercel preview deploy successful
- [ ] **ALL SECRETS ROTATED** (Azure, Graph, Ninja, Sophos, AUTH_SECRET)
- [ ] Old secrets revoked in provider portals
- [ ] Documentation updated (`02-secrets-management.md`)

### 2.7 Rollback Plan

If Vaultwarden integration fails in production:

**Emergency Rollback:**
1. Revert code to previous commit
2. Restore secrets to Vercel environment variables (from backup)
3. Deploy previous version
4. Investigate and fix issues in development
5. Re-deploy when ready

**Mitigation:**
- Keep backup of secrets in **encrypted file** (NOT in git)
- Test thoroughly in Vercel preview before production
- Deploy during low-traffic window
- Monitor error rates for 24 hours post-deployment

### 2.8 SOC2 Compliance Mapping

| Control | Requirement | Status After Implementation |
|---------|-------------|-----------------------------|
| CC6.1 - Logical Access | Restrict access to secrets | ✅ PASS - Vaultwarden RBAC |
| CC7.1 - System Operations | Secrets not in code | ✅ PASS - Vault only |
| CC7.2 - Change Management | Secrets rotation tracking | ✅ PASS - Vaultwarden audit log |

---

## 3. Phase 2: Encryption at Rest

**Timeline:** Weeks 4-5 (8 hours)
**Priority:** CRITICAL (SOC2 CC6.3, HIPAA §164.312)

### 3.1 Current State

- **Production DB:** Neon.tech PostgreSQL 17
- **Encryption:** Unknown (need to verify)
- **Local Dev DB:** PostgreSQL without encryption

### 3.2 Target State

- **Production:** Neon.tech with Transparent Data Encryption (TDE) enabled
- **Scope:** All data at rest (tables, indexes, backups)
- **Algorithm:** AES-256
- **Performance:** < 10% overhead

### 3.3 Implementation

#### Step 1: Verify Neon.tech Encryption (30 minutes)

```bash
# 1. Log in to Neon.tech dashboard
# 2. Navigate to Project → Settings → Security
# 3. Check "Encryption at Rest" status

# If enabled:
#   - Download compliance certificate
#   - Document configuration
#   - DONE ✅

# If NOT enabled:
#   - Upgrade to plan with encryption
#   - OR migrate to encrypted instance
```

**Expected Result:** Neon.tech has encryption enabled by default on all plans (verify in dashboard).

#### Step 2: Document Configuration (1 hour)

Create `docs/security/03-encryption-at-rest.md`:

```markdown
# Encryption at Rest

## Overview
TUM2026 uses Neon.tech Transparent Data Encryption (TDE) to protect all data at rest.

## Configuration
- **Provider:** Neon.tech PostgreSQL 17
- **Algorithm:** AES-256
- **Scope:** All tables, indexes, and backups
- **Key Management:** Neon-managed encryption keys

## Compliance
- SOC2 CC6.3: Data Classification - PASS ✅
- HIPAA §164.312(a)(2)(iv): Encryption at Rest - PASS ✅

## Evidence
- Neon.tech compliance certificate (attached)
- Screenshot of security configuration

## Performance Impact
- < 5% overhead on query performance
- Transparent to application (no code changes)

## Verification
1. Log in to Neon.tech dashboard
2. Navigate to Settings → Security
3. Verify "Encryption at Rest" shows "Enabled"
```

#### Step 3: Take Screenshots (15 minutes)

1. Neon.tech security settings page
2. Encryption status indicator
3. Compliance certificates page

Store in: `docs/security/evidence/neon-encryption-*.png`

#### Step 4: Local Development Database (Optional - 6 hours)

**Option A: Leave unencrypted** (Recommended)
- Local dev uses test/synthetic data only
- No real PII/PHI
- Simplifies local development
- **Effort: 0 hours**

**Option B: Enable encryption with pgcrypto**
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encrypted column type
CREATE OR REPLACE FUNCTION encrypt_text(data TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;

-- Modify schema to use encrypted columns
-- (requires schema migration)
```
- **Effort: 6-8 hours** (migration + testing)
- **Benefit: Dev/prod parity**
- **Drawback: Complexity, slower queries in dev**

**Recommendation:** Option A (leave dev unencrypted) unless you handle real customer data in local development.

### 3.4 Testing

**Production Database:**
```bash
# 1. Connect to Neon.tech via psql
psql $DATABASE_URL

# 2. Verify connection works
SELECT version();

# 3. Run sample query
SELECT COUNT(*) FROM "User";

# 4. Verify performance (should be similar)
EXPLAIN ANALYZE SELECT * FROM "User" LIMIT 100;
```

**Application:**
```bash
# No code changes required, but verify:
npm run dev
# Navigate to all major pages
# Verify data loads correctly
# No errors in console
```

**Pre-Commit Checklist:**
- [ ] Neon.tech encryption verified as enabled
- [ ] Compliance certificate downloaded
- [ ] Documentation created
- [ ] Screenshots captured
- [ ] Application tested (no code changes needed)
- [ ] Performance acceptable (< 10% overhead)

### 3.5 SOC2 Compliance Mapping

| Control | Requirement | Status After Implementation |
|---------|-------------|-----------------------------|
| CC6.3 - Data Classification | Protect sensitive data | ✅ PASS - TDE enabled |
| CC5.1 - Control Activities | Encryption controls | ✅ PASS - Neon-managed |

---

## 4. Phase 3: Reliable Audit Logging

**Timeline:** Weeks 6-8 (24 hours)
**Priority:** HIGH (SOC2 CC4.1, HIPAA §164.312(b))

### 4.1 Current State Problem

```typescript
// src/lib/audit.ts (CURRENT)
export function logAudit(params) {
  prisma.auditLog
    .create({ data: {...} })
    .catch((err) => {
      console.error("Audit log failed:", err);
      // ❌ Error logged to console only
      // ❌ Action proceeds even if audit failed
      // ❌ No retry mechanism
    });
}
```

**Problems:**
- **Fire-and-forget:** If DB is down, audit is lost but action succeeds
- **Silent failures:** No alert if logging fails
- **No guarantees:** Cannot prove an action was audited
- **Compliance violation:** SOC2 CC4.1, HIPAA §164.312(b)

### 4.2 Target Architecture

```
┌────────────────────────────────────────────────┐
│ Application Layer                              │
│                                                │
│  Critical Action (e.g., permission change)     │
│  ├─> auditSync()  ──┐                          │
│  │                  │                          │
│  └─> Business Logic │                          │
│       (only if      │                          │
│        audit OK)    │                          │
└─────────────────────┼──────────────────────────┘
                      ↓
┌────────────────────────────────────────────────┐
│ Audit Service (src/lib/audit-v2.ts)           │
│                                                │
│  auditSync(): Transactional, blocks on write  │
│  auditAsync(): Queue + retry (3 attempts)     │
│  auditBatch(): Bulk insert for performance    │
└────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────┐
│ Storage Layer                                  │
│                                                │
│  Primary: PostgreSQL AuditLog table            │
│  Backup: Local file if DB fails (future)      │
│  External: Datadog/Splunk (future)            │
└────────────────────────────────────────────────┘
```

### 4.3 Implementation

#### Step 1: Create New Audit Service (8 hours)

**New file: `src/lib/audit-v2.ts`**

```typescript
import { prisma } from '@/lib/prisma';
import { Queue } from 'async-queue';

export interface AuditParams {
  actor: string;
  action: string;
  entity: string;
  entityId?: string | number;
  details?: Record<string, unknown>;
}

// Transactional: blocks until written
export async function auditSync(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: params.actor,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId != null ? String(params.entityId) : null,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (error) {
    // Log to file as backup
    await logToFile(params);

    // Re-throw to block the action
    throw new Error(`Audit logging failed: ${error}`);
  }
}

// Async with retry queue
const auditQueue = new Queue({ concurrency: 5 });

export function auditAsync(params: AuditParams): void {
  auditQueue.add(async () => {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        await prisma.auditLog.create({
          data: {
            actor: params.actor,
            action: params.action,
            entity: params.entity,
            entityId: params.entityId != null ? String(params.entityId) : null,
            details: params.details ? JSON.stringify(params.details) : null,
          },
        });
        return; // Success
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          // Failed after 3 attempts - log to file
          await logToFile(params);
          console.error(`Audit logging failed after ${maxAttempts} attempts:`, error);
          // Alert monitoring system (future)
        } else {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }
  });
}

// Batch insert for high-volume events
export async function auditBatch(events: AuditParams[]): Promise<void> {
  await prisma.auditLog.createMany({
    data: events.map(e => ({
      actor: e.actor,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId != null ? String(e.entityId) : null,
      details: e.details ? JSON.stringify(e.details) : null,
    })),
  });
}

// Backup logging to file system
async function logToFile(params: AuditParams): Promise<void> {
  const fs = await import('fs/promises');
  const path = '/var/log/tum2026/audit-failures.log';

  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...params,
  }) + '\n';

  try {
    await fs.appendFile(path, logEntry);
  } catch (error) {
    console.error('Failed to write audit backup to file:', error);
  }
}
```

#### Step 2: Classify Audit Events (4 hours)

Create classification guide:

**CRITICAL Events (use `auditSync`):**
- Authentication: LOGIN, LOGOUT, PASSWORD_RESET
- Authorization: PERMISSION_CHANGE, ROLE_CHANGE
- Data: TENANT_CREATE, TENANT_DELETE, USER_DELETE
- Security: SECRET_ACCESS, ENCRYPTION_KEY_ROTATION
- Cross-link: DEVICE_LINK, DEVICE_UNLINK

**STANDARD Events (use `auditAsync`):**
- Data modifications: TENANT_UPDATE, TASK_UPDATE
- Assignments: DEVICE_ASSIGN, PERMISSION_ASSIGN
- Syncs: TECH_SYNC, DEVICE_SYNC

**LOW-PRIORITY Events (use `auditAsync` or `auditBatch`):**
- Reads: PAGE_VIEW, REPORT_VIEW
- Searches: SEARCH_QUERY
- Notifications: NOTIFICATION_SENT
- Bookmarks: BOOKMARK_CREATE

**Classification Rule:**
> If the action CANNOT be undone or has security implications, it's CRITICAL.

#### Step 3: Migrate Application Code (8 hours)

**High-Priority Files (use `auditSync`):**

1. **`src/lib/auth.ts`** - Authentication events
   ```typescript
   // In signIn event
   await auditSync({
     actor: user.email ?? "unknown",
     action: "LOGIN",
     entity: "SESSION",
     entityId: user.id,
   });
   ```

2. **`src/app/dashboard/tenants/new/actions.ts`** - Tenant CRUD
   ```typescript
   export async function createTenant(prevState: string, formData: FormData) {
     // ... validation ...

     const tenant = await prisma.tenant.create({ data });

     // CRITICAL: Must log before returning
     await auditSync({
       actor: await getActor(),
       action: "TENANT_CREATE",
       entity: "TENANT",
       entityId: tenant.id,
       details: { tenantName: tenant.tenantName },
     });

     return "";
   }
   ```

3. **`src/app/dashboard/permissions/actions.ts`** - Permission changes
   ```typescript
   export async function assignPermission(userId: string, permissionId: number) {
     await prisma.userPermission.create({
       data: { userId, permissionId },
     });

     // CRITICAL: Permission changes must be audited
     await auditSync({
       actor: await getActor(),
       action: "PERMISSION_ASSIGN",
       entity: "USER_PERMISSION",
       entityId: `${userId}:${permissionId}`,
     });
   }
   ```

**Medium-Priority Files (use `auditAsync`):**

4. **`src/app/dashboard/tenants/[id]/edit/actions.ts`** - Tenant updates
   ```typescript
   auditAsync({
     actor: await getActor(),
     action: "TENANT_UPDATE",
     entity: "TENANT",
     entityId: id,
   });
   ```

5. **Search, bookmarks, notifications** - Use `auditAsync`

**Batch Logging Example:**

```typescript
// For bulk operations
const events = results.map(result => ({
  actor: 'system',
  action: 'DEVICE_SYNC',
  entity: 'DEVICE',
  entityId: result.deviceId,
}));

await auditBatch(events);
```

#### Step 4: Implement Retry Queue (4 hours)

Install dependency:
```bash
npm install async-queue
```

Configure retry behavior:
```typescript
// src/lib/audit-v2.ts
const auditQueue = new Queue({
  concurrency: 5,
  maxRetries: 3,
  retryDelay: (attempt) => Math.pow(2, attempt) * 1000, // 2s, 4s, 8s
});

auditQueue.on('error', (error, job) => {
  console.error('Audit queue error:', error);
  // Future: Alert monitoring system
});

auditQueue.on('failed', (error, job) => {
  console.error('Audit job failed permanently:', error);
  // Write to backup file
  logToFile(job.data);
});
```

### 4.4 Data Retention Policy

#### Retention Periods

```typescript
// src/lib/audit-retention.ts
export const RETENTION_POLICY = {
  // CRITICAL events - 7 years (compliance requirement)
  CRITICAL: 7 * 365,

  // STANDARD events - 2 years
  STANDARD: 2 * 365,

  // LOW-PRIORITY events - 90 days
  LOW_PRIORITY: 90,
};

const CRITICAL_ACTIONS = [
  'LOGIN', 'LOGOUT', 'PASSWORD_RESET',
  'PERMISSION_CHANGE', 'ROLE_CHANGE',
  'TENANT_CREATE', 'TENANT_DELETE',
  'USER_DELETE', 'SECRET_ACCESS',
];

export async function enforceRetention(): Promise<void> {
  const now = new Date();

  // Delete low-priority events older than 90 days
  const lowPriorityCutoff = new Date(now);
  lowPriorityCutoff.setDate(lowPriorityCutoff.getDate() - RETENTION_POLICY.LOW_PRIORITY);

  await prisma.auditLog.deleteMany({
    where: {
      timestamp: { lt: lowPriorityCutoff },
      action: {
        in: ['PAGE_VIEW', 'SEARCH_QUERY', 'BOOKMARK_CREATE'],
      },
    },
  });

  // Delete standard events older than 2 years
  const standardCutoff = new Date(now);
  standardCutoff.setDate(standardCutoff.getDate() - RETENTION_POLICY.STANDARD);

  await prisma.auditLog.deleteMany({
    where: {
      timestamp: { lt: standardCutoff },
      action: { notIn: CRITICAL_ACTIONS },
    },
  });

  // CRITICAL events are kept for 7 years
  // (No deletion logic needed - handled by separate job)

  console.log('Retention policy enforced');
}
```

#### Cron Job Setup

```typescript
// src/app/api/cron/retention/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { enforceRetention } from '@/lib/audit-retention';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await enforceRetention();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Retention job failed:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**Vercel Cron Configuration:**

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/retention",
    "schedule": "0 0 1 * *"
  }]
}
```

Runs on 1st day of each month at midnight.

### 4.5 Tamper Protection

**Level 1 (Implemented in Phase 3):**

1. **Separate table:** Audit logs in dedicated `AuditLog` table
2. **No UI for modification:** No delete/update routes exposed
3. **Admin-only access:** Only users with ADMIN role can view logs
4. **Immutable by design:** No UPDATE or DELETE queries in codebase

**Level 2 (Future Enhancement):**

1. **Write-only DB user:**
   ```sql
   CREATE USER audit_writer WITH PASSWORD 'xxx';
   GRANT INSERT ON audit_logs TO audit_writer;
   GRANT SELECT ON audit_logs TO app_user;
   -- No UPDATE or DELETE permissions
   ```

2. **Hash chain:** Each log includes hash of previous log
   ```typescript
   interface AuditLog {
     id: number;
     previousHash: string;
     currentHash: string; // SHA-256 of (id + data + previousHash)
   }
   ```

3. **External backup:** Daily backup to S3 or Datadog
   ```typescript
   // Cron job: Export yesterday's logs
   const logs = await prisma.auditLog.findMany({
     where: { timestamp: { gte: yesterday, lt: today } },
   });
   await uploadToS3(logs);
   ```

### 4.6 Testing Strategy

**Unit Tests:**

```typescript
// tests/lib/audit-v2.test.ts
describe('auditSync', () => {
  it('writes audit log successfully', async () => {
    await auditSync({
      actor: 'test@example.com',
      action: 'TEST',
      entity: 'TEST_ENTITY',
    });

    const log = await prisma.auditLog.findFirst({
      where: { action: 'TEST' },
    });

    expect(log).toBeTruthy();
    expect(log?.actor).toBe('test@example.com');
  });

  it('throws error if DB is down', async () => {
    // Mock Prisma to fail
    jest.spyOn(prisma.auditLog, 'create').mockRejectedValue(new Error('DB down'));

    await expect(auditSync({
      actor: 'test@example.com',
      action: 'TEST',
      entity: 'TEST_ENTITY',
    })).rejects.toThrow('Audit logging failed');
  });

  it('writes to backup file if DB fails', async () => {
    jest.spyOn(prisma.auditLog, 'create').mockRejectedValue(new Error('DB down'));

    try {
      await auditSync({ actor: 'test', action: 'TEST', entity: 'TEST' });
    } catch {
      // Expected to throw
    }

    // Verify file was written
    const fs = await import('fs/promises');
    const content = await fs.readFile('/var/log/tum2026/audit-failures.log', 'utf-8');
    expect(content).toContain('TEST');
  });
});

describe('auditAsync', () => {
  it('retries on failure', async () => {
    const mockCreate = jest.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce({ id: 1 });

    jest.spyOn(prisma.auditLog, 'create').mockImplementation(mockCreate);

    auditAsync({ actor: 'test', action: 'TEST', entity: 'TEST' });

    // Wait for retries
    await new Promise(resolve => setTimeout(resolve, 10000));

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('gives up after 3 attempts', async () => {
    jest.spyOn(prisma.auditLog, 'create').mockRejectedValue(new Error('Fail'));

    auditAsync({ actor: 'test', action: 'TEST', entity: 'TEST' });

    // Wait for all retries
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Should have written to backup file
    const fs = await import('fs/promises');
    const content = await fs.readFile('/var/log/tum2026/audit-failures.log', 'utf-8');
    expect(content).toContain('TEST');
  });
});
```

**Integration Tests:**

```typescript
describe('Critical Action Auditing', () => {
  it('audits tenant creation', async () => {
    const response = await fetch('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(validTenantData),
    });

    expect(response.status).toBe(201);

    // Verify audit log was created
    const log = await prisma.auditLog.findFirst({
      where: { action: 'TENANT_CREATE' },
      orderBy: { timestamp: 'desc' },
    });

    expect(log).toBeTruthy();
  });

  it('blocks action if audit fails', async () => {
    // Mock DB down
    jest.spyOn(prisma.auditLog, 'create').mockRejectedValue(new Error('DB down'));

    const response = await fetch('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(validTenantData),
    });

    // Action should fail
    expect(response.status).toBe(500);

    // Tenant should NOT be created
    const tenant = await prisma.tenant.findFirst({
      where: { tenantName: validTenantData.tenantName },
    });
    expect(tenant).toBeNull();
  });
});
```

**Pre-Commit Checklist:**

- [ ] All critical actions use `auditSync`
- [ ] Non-critical actions use `auditAsync`
- [ ] Retry queue configured with exponential backoff
- [ ] Backup file logging implemented
- [ ] Retention policy configured
- [ ] Cron job set up for monthly cleanup
- [ ] Unit tests pass (>90% coverage)
- [ ] Integration tests pass
- [ ] Documentation created (`04-audit-logging-policy.md`)

### 4.7 SOC2 Compliance Mapping

| Control | Requirement | Status After Implementation |
|---------|-------------|-----------------------------|
| CC4.1 - Monitoring | System monitoring | ✅ PASS - Comprehensive audit logs |
| CC4.2 - Event Detection | Detect anomalies | ✅ PASS - All critical actions logged |
| CC7.2 - Change Management | Track changes | ✅ PASS - Immutable audit trail |

---

## 5. Phase 4: Input Validation (Zod)

**Timeline:** Weeks 9-12 (40 hours)
**Priority:** MEDIUM-HIGH (SOC2 CC5.1, prevents injection attacks)

### 5.1 Current State Problem

```typescript
// EXAMPLE: src/app/api/tenants/[id]/users/route.ts (CURRENT)
export async function GET(request: NextRequest, { params }) {
  const { id } = await params;
  const tenantId = Number(id);

  // ❌ Only checks isNaN
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  // ❌ No validation of query params
  // ❌ No validation of request body (in POST routes)
  // ❌ Generic error messages
  // ❌ Each route has different validation logic
}
```

**Problems:**
- Minimal validation (type only, not range/format)
- No body/query parameter validation
- Inconsistent error handling across routes
- Vulnerability to type coercion attacks
- **Zod installed but unused**

### 5.2 Target Architecture

```
┌─────────────────────────────────────────────────┐
│ API Route Handler                               │
│                                                 │
│ 1. Parse request (params/body/query)           │
│ 2. Validate with Zod schema                    │
│ 3. If invalid → 400 with detailed errors       │
│ 4. If valid → Execute business logic           │
│ 5. Return success response                     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Shared Schemas (src/lib/validation/)           │
│                                                 │
│ • common.ts    - Reusable primitives            │
│ • tenants.ts   - Tenant schemas                 │
│ • tasks.ts     - Task execution schemas         │
│ • auth.ts      - Authentication schemas         │
│ • devices.ts   - Device schemas                 │
│ • search.ts    - Search/filter schemas          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Validation Helpers (src/lib/validate.ts)       │
│                                                 │
│ • validateRequest()   - Main validation fn      │
│ • validateParams()    - URL parameters          │
│ • validateBody()      - Request body            │
│ • validateQuery()     - Query string            │
└─────────────────────────────────────────────────┘
```

### 5.3 Implementation

#### Step 1: Create Shared Schemas (8 hours)

**File: `src/lib/validation/common.ts`**

```typescript
import { z } from 'zod';

// Primitives
export const IdSchema = z.coerce.number().int().positive();
export const EmailSchema = z.string().email();
export const UuidSchema = z.string().uuid();
export const UrlSchema = z.string().url();
export const DateTimeSchema = z.string().datetime();

// Pagination
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Date range
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: "Start date must be before end date" }
);

// Search
export const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  filters: z.record(z.string()).optional(),
});
```

**File: `src/lib/validation/tenants.ts`**

```typescript
import { z } from 'zod';
import { IdSchema, UuidSchema, UrlSchema } from './common';

export const CreateTenantSchema = z.object({
  tenantName: z.string()
    .min(3, "Tenant name must be at least 3 characters")
    .max(100, "Tenant name must be at most 100 characters"),

  tenantAbbrv: z.string()
    .min(2, "Abbreviation must be at least 2 characters")
    .max(10, "Abbreviation must be at most 10 characters")
    .transform(val => val.toUpperCase()),

  tenantIdRewst: UuidSchema,
  tenantIdMsft: UuidSchema,

  domainUrl: UrlSchema.optional(),

  ninjaOrgId: z.coerce.number().int().positive().optional(),
  sophosOrgId: z.string().optional(),
});

export const UpdateTenantSchema = CreateTenantSchema.partial();

export const TenantIdParamSchema = z.object({
  id: IdSchema,
});
```

**File: `src/lib/validation/tasks.ts`**

```typescript
import { z } from 'zod';
import { IdSchema } from './common';

export const ExecuteTaskSchema = z.object({
  taskId: IdSchema,
  tenantId: IdSchema,
  targetUser: z.string().email().optional(),
  ticketNumber: z.string()
    .regex(/^[A-Z]+-\d+$/, "Ticket must be format: ABC-123")
    .optional(),
  parameters: z.record(z.string()).optional(),
});

export const TaskRunFilterSchema = z.object({
  status: z.enum(['RUNNING', 'SUCCESS', 'FAILED']).optional(),
  taskId: IdSchema.optional(),
  actor: z.string().email().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
```

**File: `src/lib/validation/devices.ts`**

```typescript
import { z } from 'zod';
import { IdSchema } from './common';

export const DeviceAssignmentSchema = z.object({
  tenantId: IdSchema,
  ninjaDeviceId: IdSchema,
  ninjaDeviceName: z.string().min(1).max(200),
  adUserUpn: z.string().email(),
  adUserName: z.string().min(1).max(200),
});

export const CrossLinkSchema = z.object({
  tenantId: IdSchema,
  ninjaDeviceId: IdSchema,
  ninjaDeviceName: z.string().min(1).max(200),
  sophosEndpointId: z.string().uuid(),
  sophosEndpointName: z.string().min(1).max(200),
});
```

#### Step 2: Create Validation Helpers (4 hours)

**File: `src/lib/validate.ts`**

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: NextResponse;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.flatten();

    return {
      success: false,
      error: NextResponse.json(
        {
          error: "Validation failed",
          fields: errors.fieldErrors,
          formErrors: errors.formErrors,
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

// Convenience wrappers
export async function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: Promise<unknown>
): Promise<ValidationResult<T>> {
  const data = await params;
  return validateRequest(schema, data);
}

export async function validateBody<T>(
  schema: z.ZodSchema<T>,
  request: Request
): Promise<ValidationResult<T>> {
  const body = await request.json();
  return validateRequest(schema, body);
}

export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): ValidationResult<T> {
  const query = Object.fromEntries(searchParams.entries());
  return validateRequest(schema, query);
}
```

#### Step 3: Migrate API Routes (28 hours)

**Total routes to migrate: ~50**

**High Priority (16 routes, 12 hours):**

1. **Tenant routes** (6 routes)
   - GET /api/tenants
   - POST /api/tenants
   - GET /api/tenants/[id]
   - PUT /api/tenants/[id]
   - DELETE /api/tenants/[id]
   - GET /api/tenants/[id]/users

2. **Task routes** (4 routes)
   - POST /api/tasks/execute
   - GET /api/tasks/[id]/runs
   - POST /api/tasks/[id]/retry
   - GET /api/runs (with filters)

3. **Permission routes** (3 routes)
   - POST /api/permissions/[id]/assign-to-user
   - POST /api/permissions/[id]/assign-to-task
   - POST /api/permissions/[id]/assign-to-tech

4. **Device routes** (3 routes)
   - POST /api/devices/assign
   - POST /api/cross-links
   - DELETE /api/cross-links/[id]

**Example Migration:**

```typescript
// BEFORE: src/app/api/tenants/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();

  // ❌ No validation
  const tenant = await prisma.tenant.create({ data: body });

  return NextResponse.json(tenant, { status: 201 });
}

// AFTER: src/app/api/tenants/route.ts
import { validateBody } from '@/lib/validate';
import { CreateTenantSchema } from '@/lib/validation/tenants';

export async function POST(request: NextRequest) {
  const validation = await validateBody(CreateTenantSchema, request);
  if (!validation.success) return validation.error;

  const { data } = validation; // ✅ Type-safe and validated

  const tenant = await prisma.tenant.create({ data });

  await auditSync({
    actor: await getActor(),
    action: 'TENANT_CREATE',
    entity: 'TENANT',
    entityId: tenant.id,
  });

  return NextResponse.json(tenant, { status: 201 });
}
```

**Medium Priority (20 routes, 10 hours):**

- Search routes (3)
- Report routes (5)
- Custom field routes (4)
- Bookmark routes (3)
- Notification routes (5)

**Low Priority (14 routes, 6 hours):**

- Analytics routes (5)
- SSE route (1 - read-only, low risk)
- Service health routes (3)
- Alert routes (2)
- Settings routes (3)

#### Step 4: Migrate Server Actions (4 hours)

Update form handling server actions with Zod validation:

```typescript
// src/app/dashboard/tenants/new/actions.ts
"use server";

import { CreateTenantSchema } from '@/lib/validation/tenants';

export async function createTenant(
  prevState: string,
  formData: FormData
): Promise<string> {
  const rawData = Object.fromEntries(formData);

  // Validate with Zod
  const validation = CreateTenantSchema.safeParse(rawData);

  if (!validation.success) {
    // Return formatted error messages
    const errors = validation.error.flatten().fieldErrors;
    return Object.entries(errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('\n');
  }

  const data = validation.data;

  try {
    const tenant = await prisma.tenant.create({ data });

    await auditSync({
      actor: await getActor(),
      action: 'TENANT_CREATE',
      entity: 'TENANT',
      entityId: tenant.id,
    });

    revalidatePath('/dashboard/tenants');
    return ""; // Success
  } catch (error) {
    return error instanceof Error ? error.message : "Failed to create tenant";
  }
}
```

### 5.4 Validation Levels

**Level 1: Type & Presence** (Implemented in Phase 4)
- IDs are positive integers
- Emails are valid format
- Strings are not empty
- Required fields are present

**Level 2: Format & Range** (Implemented in Phase 4)
- Tenant abbreviations: 2-10 chars, uppercase
- UUIDs in correct format
- Dates in ISO 8601
- URLs are valid
- Numbers within acceptable ranges

**Level 3: Business Logic** (Already exists in app)
- Tenant name not duplicated (DB unique constraint)
- User email belongs to allowed tenant
- Task permissions valid for user
- Device not already assigned

**Phase 4 focuses on Levels 1 & 2. Level 3 is handled by existing business logic and DB constraints.**

### 5.5 Error Handling Standard

**Error Response Format:**

```typescript
{
  "error": "Validation failed",
  "fields": {
    "tenantName": ["Must be at least 3 characters"],
    "tenantIdMsft": ["Invalid UUID format"]
  },
  "formErrors": [] // Global errors not tied to specific field
}
```

**Frontend Integration:**

```typescript
// Client-side form component
const [errors, setErrors] = useState<Record<string, string[]>>({});

async function handleSubmit(data: any) {
  const response = await fetch('/api/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.json();
    if (body.fields) {
      setErrors(body.fields);
      // Display errors next to form fields
    }
  }
}
```

### 5.6 Testing Strategy

**Unit Tests (Schema Validation):**

```typescript
// tests/lib/validation/tenants.test.ts
describe('CreateTenantSchema', () => {
  it('rejects tenant name < 3 chars', () => {
    const result = CreateTenantSchema.safeParse({
      tenantName: "ab",
      tenantAbbrv: "AB",
      tenantIdRewst: "123e4567-e89b-12d3-a456-426614174000",
      tenantIdMsft: "123e4567-e89b-12d3-a456-426614174001",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('tenantName');
    }
  });

  it('transforms abbreviation to uppercase', () => {
    const result = CreateTenantSchema.parse({
      tenantName: "Test Corp",
      tenantAbbrv: "tst", // lowercase
      tenantIdRewst: "123e4567-e89b-12d3-a456-426614174000",
      tenantIdMsft: "123e4567-e89b-12d3-a456-426614174001",
    });

    expect(result.tenantAbbrv).toBe("TST");
  });

  it('rejects invalid UUID', () => {
    const result = CreateTenantSchema.safeParse({
      tenantName: "Test Corp",
      tenantAbbrv: "TST",
      tenantIdRewst: "not-a-uuid",
      tenantIdMsft: "123e4567-e89b-12d3-a456-426614174001",
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid tenant data', () => {
    const result = CreateTenantSchema.parse({
      tenantName: "Test Corp",
      tenantAbbrv: "TST",
      tenantIdRewst: "123e4567-e89b-12d3-a456-426614174000",
      tenantIdMsft: "123e4567-e89b-12d3-a456-426614174001",
      domainUrl: "https://testcorp.com",
    });

    expect(result).toBeTruthy();
  });
});
```

**Integration Tests (API Routes):**

```typescript
// tests/api/tenants.test.ts
describe('POST /api/tenants', () => {
  it('returns 400 for invalid data', async () => {
    const response = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantName: "ab", // Too short
        tenantAbbrv: "T", // Too short
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.fields.tenantName).toBeDefined();
    expect(body.fields.tenantAbbrv).toBeDefined();
  });

  it('creates tenant with valid data', async () => {
    const response = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validTenantData),
    });

    expect(response.status).toBe(201);

    const tenant = await response.json();
    expect(tenant.id).toBeTruthy();
    expect(tenant.tenantName).toBe(validTenantData.tenantName);
  });

  it('sanitizes SQL injection attempt', async () => {
    const response = await fetch('/api/tenants', {
      method: 'POST',
      body: JSON.stringify({
        tenantName: "Test'; DROP TABLE tenants; --",
        // ... other fields
      }),
    });

    // Should either accept as literal string or reject
    expect([200, 201, 400]).toContain(response.status);

    // Verify tenants table still exists
    const tenants = await prisma.tenant.findMany();
    expect(tenants).toBeDefined();
  });
});
```

**Coverage Goal:** 100% of schemas, >90% of API routes

### 5.7 Pre-Commit Checklist

- [ ] All 50 API routes have Zod validation
- [ ] All server actions have Zod validation
- [ ] Common schemas created and documented
- [ ] Validation helper functions tested
- [ ] Unit tests pass (100% schema coverage)
- [ ] Integration tests pass (>90% route coverage)
- [ ] Error responses follow standard format
- [ ] Documentation created (`05-input-validation-guide.md`)
- [ ] Performance acceptable (validation adds <10ms per request)

### 5.8 SOC2 Compliance Mapping

| Control | Requirement | Status After Implementation |
|---------|-------------|-----------------------------|
| CC5.1 - Control Activities | Input validation | ✅ PASS - All routes validated |
| CC5.2 - SDLC | Secure development | ✅ PASS - Validation framework |
| CC8.1 - Change Management | Prevent malicious input | ✅ PASS - Zod schemas |

---

## 6. Documentation Strategy

**Timeline:** Distributed across Weeks 3, 5, 8, 12 (20 hours total)

### 6.1 Documents to Create

```
docs/security/
├── 01-security-overview.md          (Week 3,  2 hrs)
├── 02-secrets-management.md         (Week 3,  2 hrs)
├── 03-encryption-at-rest.md         (Week 5,  1 hr)
├── 04-audit-logging-policy.md       (Week 8,  3 hrs)
├── 05-input-validation-guide.md     (Week 12, 2 hrs)
├── 06-incident-response-plan.md     (Week 12, 4 hrs)
├── 07-data-retention-policy.md      (Week 8,  2 hrs)
├── 08-access-control-policy.md      (Week 12, 2 hrs)
└── architecture-diagrams/
    ├── secrets-flow.png             (Week 3,  1 hr)
    └── audit-logging-flow.png       (Week 8,  1 hr)
```

**Total: 20 hours**

### 6.2 Document Templates

Each document follows this structure:

```markdown
# [Control Name]

**Version:** 1.0
**Last Updated:** YYYY-MM-DD
**Owner:** [Role/Name]
**Review Frequency:** Quarterly

## 1. Purpose

[Why does this control exist? What problem does it solve?]

## 2. Scope

[What systems, data, and processes does this cover?]

## 3. Implementation

### 3.1 Technical Details

[How is this implemented technically? Architecture, tools, configs]

### 3.2 Procedures

[Step-by-step procedures for common operations]

## 4. Responsibilities

- **Owner:** [Who owns this control]
- **Implementers:** [Who maintains/operates]
- **Reviewers:** [Who audits/reviews]
- **Escalation:** [Who to contact for issues]

## 5. Compliance Mapping

| Framework | Control | Status |
|-----------|---------|--------|
| SOC2      | [TSC]   | ✅ PASS |
| HIPAA     | [§XXX]  | ✅ PASS |
| CMMC      | [X.Y]   | ✅ PASS |

## 6. Evidence & Artifacts

[Screenshots, logs, configuration exports, certificates]

## 7. Review History

- **YYYY-MM-DD:** Initial version (v1.0)
- **YYYY-MM-DD:** Updated after [change] (v1.1)
```

### 6.3 Key Documents

#### 01-security-overview.md (Executive Summary)

**Audience:** Non-technical stakeholders, investors, auditors

**Content:**
- High-level architecture diagram
- Security controls summary (4-5 paragraphs)
- Compliance status table (SOC2, HIPAA, CMMC)
- Contact information for security team
- 2-3 pages, non-technical language

**Purpose:** Quick overview for due diligence calls

#### 06-incident-response-plan.md (CRITICAL)

**Audience:** Technical team, security team, management

**Content:**
1. **Definition of Incident:**
   - Security breach (unauthorized access)
   - Data leak (exposure of PII/PHI)
   - Service disruption (DoS, ransomware)
   - Insider threat

2. **Severity Levels:**
   - P0 (Critical): Data breach, production down
   - P1 (High): Security vulnerability exploited
   - P2 (Medium): Suspicious activity detected
   - P3 (Low): Minor security issue

3. **Response Procedure:**
   ```
   1. DETECT
      - Monitoring alerts
      - User reports
      - Audit log anomalies

   2. ASSESS
      - Determine severity (P0-P3)
      - Identify scope
      - Estimate impact

   3. CONTAIN
      - Isolate affected systems
      - Revoke compromised credentials
      - Enable maintenance mode

   4. INVESTIGATE
      - Review audit logs
      - Interview witnesses
      - Preserve evidence

   5. REMEDIATE
      - Fix vulnerability
      - Restore systems
      - Verify security

   6. COMMUNICATE
      - Notify stakeholders
      - Update customers (if needed)
      - Report to authorities (if required)

   7. POST-MORTEM
      - Root cause analysis
      - Lessons learned
      - Update procedures
   ```

4. **Contact List:**
   - Security Officer: [Name, Phone, Email]
   - Technical Lead: [Name, Phone, Email]
   - Legal Counsel: [Name, Phone, Email]
   - PR/Communications: [Name, Phone, Email]

5. **Notification Requirements:**
   - HIPAA Breach: 60 days (if ePHI involved)
   - GDPR: 72 hours (if EU citizens affected)
   - Customers: 7 days (if their data affected)

**Purpose:** Essential for due diligence and compliance

### 6.4 Architecture Diagrams

**secrets-flow.png:**

```
┌─────────────────┐
│   Developer     │
│ (Laptop/Local)  │
└────────┬────────┘
         │ bw get secret
         │
    ┌────▼────────────────┐
    │  Vaultwarden Server │
    │  (Self-hosted)      │
    └────┬────────────────┘
         │
         ├──────> [Next.js Dev]  (getSecret())
         │
         └──────> [Vercel Build] (bw sync)
                        │
                        └──> [Vercel Runtime] (getSecret())
```

**audit-logging-flow.png:**

```
┌──────────────┐
│ User Action  │
└──────┬───────┘
       │
   ┌───▼────────────────┐
   │   API Route        │
   └───┬────────────────┘
       │
       ├──> auditSync() ──────┐
       │                      │
       └──> auditAsync() ──┐  │
                           │  │
                      ┌────▼──▼─────────┐
                      │  Audit Service  │
                      │  (audit-v2.ts)  │
                      └────┬────────────┘
                           │
                      ┌────▼─────────────┐
                      │   PostgreSQL     │
                      │   AuditLog       │
                      └──────────────────┘
                           │
                      ┌────▼─────────────┐
                      │  Backup File     │
                      │  (if DB fails)   │
                      └──────────────────┘
```

### 6.5 Timeline

| Week | Implementation | Documentation |
|------|----------------|---------------|
| 3 | Secrets complete | 01-overview.md + 02-secrets.md + diagram (4 hrs) |
| 5 | Encryption complete | 03-encryption.md (1 hr) |
| 8 | Audit logging complete | 04-audit.md + 07-retention.md + diagram (5 hrs) |
| 12 | Input validation complete | 05-validation.md + 06-incident.md + 08-access.md + compliance matrix (10 hrs) |

**Advantage:** Documentation is written while implementation is fresh in mind.

### 6.6 Compliance Matrix

Create master control mapping document:

```markdown
# SOC2 Controls Mapping - TUM2026

## Common Criteria (CC)

| Control | Description | Status | Evidence |
|---------|-------------|--------|----------|
| CC1.1 | COSO Principles | 🟡 PARTIAL | [Need formal security policies] |
| CC4.1 | Monitoring | ✅ PASS | 04-audit-logging-policy.md |
| CC5.1 | Control Activities | ✅ PASS | 05-input-validation-guide.md |
| CC6.1 | Logical Access | ✅ PASS | 08-access-control-policy.md |
| CC6.3 | Data Classification | ✅ PASS | 03-encryption-at-rest.md |
| CC7.1 | System Operations | ✅ PASS | 02-secrets-management.md |
| CC7.2 | Change Management | 🟡 PARTIAL | [Need formal change process] |
| CC8.1 | Vendor Management | ❌ FAIL | [Need vendor assessments] |

## Availability

| Control | Description | Status | Evidence |
|---------|-------------|--------|----------|
| A1.1 | Availability Commitments | 🟡 PARTIAL | [Need SLA definition] |
| A1.2 | System Availability | ✅ PASS | Vercel 99.99% SLA |

## Processing Integrity

| Control | Description | Status | Evidence |
|---------|-------------|--------|----------|
| PI1.1 | Processing Integrity | ✅ PASS | 05-input-validation-guide.md |

## Confidentiality

| Control | Description | Status | Evidence |
|---------|-------------|--------|----------|
| C1.1 | Confidential Information | ✅ PASS | 03-encryption-at-rest.md |
| C1.2 | Disposal | 🟡 PARTIAL | 07-data-retention-policy.md |

## Privacy (if applicable)

| Control | Description | Status | Evidence |
|---------|-------------|--------|----------|
| P1.1 | Notice | ❌ FAIL | [Need privacy policy] |
| P4.1 | Data Retention | ✅ PASS | 07-data-retention-policy.md |

---

**Overall Compliance: 75% (up from 40%)**

✅ PASS: 12 controls
🟡 PARTIAL: 5 controls
❌ FAIL: 3 controls
```

This matrix is **gold for due diligence** - shows compliance at a glance.

### 6.7 Maintenance

**Review Schedule:**
- **Quarterly:** Review all policies for accuracy
- **After major changes:** Update affected docs within 1 week
- **Annual:** Full audit of all documentation

**Triggers for Updates:**
- New integration (API, service)
- Security incident
- Compliance audit finding
- Major architecture change

**Version Control:**
- All docs in git (docs/security/)
- Use semantic versioning (1.0, 1.1, 2.0)
- Update "Review History" section in each doc

---

## 7. Testing & Validation

**Total Testing Effort:** 19 hours (distributed)

### 7.1 Testing by Phase

#### Phase 1: Secrets Management (4 hours)

**Unit Tests:**
- Secret retrieval from Vaultwarden
- Cache behavior (1-hour TTL)
- Error handling (secret not found)
- Fallback to env vars (dev only)

**Integration Tests:**
- App startup with Vaultwarden
- Authentication flow (NextAuth + secrets)
- Graph API calls (using secrets from vault)
- NinjaOne API calls
- Sophos API calls
- Database connection

**Checklist:**
- [ ] All secrets migrated to Vaultwarden
- [ ] `.env.local` contains only VAULTWARDEN_* vars
- [ ] App starts in local dev
- [ ] All integrations work
- [ ] Vercel preview deploy successful
- [ ] Secrets rotated
- [ ] Old secrets revoked

#### Phase 2: Encryption at Rest (1 hour)

**Verification:**
- Neon.tech dashboard shows encryption enabled
- Connection test successful
- Performance benchmarks (< 10% overhead)
- Compliance certificate downloaded

**No code changes, so minimal testing needed.**

#### Phase 3: Audit Logging (6 hours)

**Unit Tests:**
- `auditSync` writes successfully
- `auditSync` throws error if DB down
- `auditSync` writes to backup file on failure
- `auditAsync` retries on failure (3 attempts)
- `auditAsync` writes to backup after max retries
- Retention policy deletes old logs

**Integration Tests:**
- Login → audit log written
- Tenant creation → audit log written (sync)
- Search → audit log written (async)
- DB down → critical action fails
- Async retry → succeeds on 2nd attempt

**Checklist:**
- [ ] All critical actions use `auditSync`
- [ ] Non-critical actions use `auditAsync`
- [ ] Retry queue configured
- [ ] Backup file logging works
- [ ] Retention cron job configured
- [ ] Tests pass (>90% coverage)

#### Phase 4: Input Validation (8 hours)

**Unit Tests (per schema):**
- Rejects invalid data (wrong type, format, range)
- Accepts valid data
- Transforms data correctly (e.g., uppercase)
- Error messages are descriptive

**Integration Tests (per route):**
- POST with invalid data → 400
- POST with valid data → 201
- Error response has correct format
- SQL injection attempts blocked

**Checklist:**
- [ ] All 50 routes have validation
- [ ] All server actions have validation
- [ ] Unit tests pass (100% schema coverage)
- [ ] Integration tests pass (>90% routes)
- [ ] Error format standardized

### 7.2 End-to-End Testing

**After completing all 4 phases:**

**Scenario 1: Happy Path**
```bash
1. Login with ADMIN user
2. Create new tenant
3. Assign permissions to user
4. View audit logs
5. Verify all actions audited
6. Search for tenant
7. Create device cross-link
```

**Scenario 2: Attack Simulation**
```bash
1. SQL injection in tenant name → Blocked
2. XSS in tenant details → Sanitized
3. Access tenant without permissions → 403
4. Malformed data in POST → 400
5. Verify all attempts audited
```

**Scenario 3: Secrets Rotation**
```bash
1. Rotate Azure client secret
2. Update in Vaultwarden
3. Wait 61 minutes (cache expiry)
4. App reloads secret automatically
5. Verify Graph API still works
```

**Scenario 4: Failure Scenarios**
```bash
1. Vaultwarden down → App fails gracefully
2. DB down → Critical actions fail
3. Network issues → Async audit retries
4. Verify backup logging works
```

### 7.3 Performance Testing

**Benchmarks:**

```bash
# Before implementation
ab -n 1000 -c 10 https://tum2026.vercel.app/api/tenants

# After implementation
ab -n 1000 -c 10 https://tum2026.vercel.app/api/tenants

# Compare:
# - Average response time (should be < 10% increase)
# - Requests per second (should be similar)
# - Error rate (should be 0)
```

**Acceptable overhead:**
- Secrets (Vaultwarden): +5-10ms (cached)
- Encryption (Neon TDE): +5-10% query time
- Audit logging: +2-5ms (async has 0 overhead)
- Input validation: +1-3ms

**Total overhead: < 15% increase in response times**

### 7.4 Compliance Validation

**Checklist:**

```markdown
## SOC2 Common Criteria

- [ ] CC6.1 - Logical Access
  - RBAC implemented
  - Audit logs for access
  - Evidence: 08-access-control-policy.md

- [ ] CC6.3 - Data Classification
  - Encryption at rest enabled
  - Evidence: 03-encryption-at-rest.md + Neon certificate

- [ ] CC4.1 - Monitoring
  - Comprehensive audit logging
  - >95% of critical actions logged
  - Evidence: 04-audit-logging-policy.md

- [ ] CC5.1 - Control Activities
  - Input validation on all routes
  - 100% of API routes validated
  - Evidence: 05-input-validation-guide.md

- [ ] CC7.1 - System Operations
  - Secrets in vault, not code
  - 0 secrets in git history
  - Evidence: 02-secrets-management.md

## Coverage Metrics

- [ ] Audit log coverage: >95% of critical actions
- [ ] API validation coverage: 100% of routes (50/50)
- [ ] Encryption coverage: 100% of data at rest
- [ ] Secrets coverage: 100% (0 in code)

## Documentation

- [ ] 8 security policies written
- [ ] 2 architecture diagrams created
- [ ] Compliance matrix updated
- [ ] Evidence artifacts collected (screenshots, certs)
```

### 7.5 Pre-Production Checklist

**Before final commit to main:**

- [ ] **Secrets rotated** (Azure, Graph, Ninja, Sophos, AUTH_SECRET)
- [ ] **Old secrets revoked** in provider portals
- [ ] **Git history clean** (no .env.local with old secrets)
- [ ] **All unit tests pass** (100% schema coverage)
- [ ] **All integration tests pass** (>90% route coverage)
- [ ] **Vercel preview deploy successful**
- [ ] **Performance acceptable** (< 15% overhead)
- [ ] **Documentation complete** (8 docs + 2 diagrams)
- [ ] **Compliance matrix updated**
- [ ] **Evidence collected** (screenshots, certificates)
- [ ] **Incident response plan tested** (table-top exercise)

### 7.6 Post-Deployment Validation

**First 24 hours after production deploy:**

1. **Error Monitoring:**
   ```bash
   vercel logs --project=tum2026 --follow
   # Watch for errors related to:
   # - Vaultwarden connection
   # - Audit logging failures
   # - Validation errors
   ```

2. **Audit Log Verification:**
   ```sql
   -- Check audit logs are being written
   SELECT COUNT(*), action
   FROM audit_logs
   WHERE timestamp > NOW() - INTERVAL '1 hour'
   GROUP BY action;

   -- Should see logins, searches, etc.
   ```

3. **Secrets Refresh:**
   ```bash
   # Wait 61 minutes, then:
   # Verify app is still working
   # (secrets should auto-refresh from cache)
   curl https://tum2026.vercel.app/api/tenants
   ```

4. **User Feedback:**
   - Ask 2-3 users to test major workflows
   - Any errors or slowness?
   - Any unexpected validation failures?

**First week:**

- [ ] Review error logs daily
- [ ] Verify audit log coverage
- [ ] Check for validation issues
- [ ] Monitor performance metrics
- [ ] Collect user feedback

**First month:**

- [ ] Review audit logs for anomalies
- [ ] Verify retention policy ran
- [ ] Check secrets are still valid
- [ ] Update documentation if needed

### 7.7 Continuous Validation

**Monthly:**
- [ ] Review audit logs for suspicious activity
- [ ] Verify retention policy executed
- [ ] Check error rates (should be < 1%)
- [ ] Validate backup logging works

**Quarterly:**
- [ ] Review and update all security documentation
- [ ] Access control review (who has what permissions)
- [ ] Compliance matrix update
- [ ] Table-top exercise for incident response

**Annual:**
- [ ] Rotate all secrets (Azure, Graph, Ninja, Sophos)
- [ ] Review and update security policies
- [ ] Consider external security audit
- [ ] Penetration testing (if budget allows)

---

## 8. Project Timeline

### 8.1 Detailed Schedule

**Week 1-3: Phase 1 - Secrets Management**
- Week 1 (8 hrs):
  - Prepare Vaultwarden (2 hrs)
  - Create secrets SDK (6 hrs)
- Week 2 (10 hrs):
  - Migrate application code (10 hrs)
- Week 3 (6 hrs):
  - Vercel integration (4 hrs)
  - Testing (4 hrs)
  - Documentation (4 hrs)

**Week 4-5: Phase 2 - Encryption at Rest**
- Week 4 (4 hrs):
  - Verify Neon encryption (0.5 hrs)
  - Document configuration (1 hr)
  - Screenshots (0.25 hrs)
  - Testing (1 hr)
  - Buffer (1.25 hrs)

**Week 6-8: Phase 3 - Audit Logging**
- Week 6 (8 hrs):
  - Create audit service (8 hrs)
- Week 7 (10 hrs):
  - Classify events (4 hrs)
  - Migrate application code (6 hrs)
- Week 8 (6 hrs):
  - Implement retry queue (4 hrs)
  - Testing (6 hrs)
  - Documentation (5 hrs)

**Week 9-12: Phase 4 - Input Validation**
- Week 9 (12 hrs):
  - Create schemas (8 hrs)
  - Create helpers (4 hrs)
- Week 10 (14 hrs):
  - Migrate high-priority routes (12 hrs)
  - Testing (2 hrs)
- Week 11 (14 hrs):
  - Migrate medium+low priority routes (10 hrs)
  - Migrate server actions (4 hrs)
- Week 12 (10 hrs):
  - Complete testing (6 hrs)
  - Final documentation (10 hrs)
  - E2E testing (2 hrs)

**Total: 147 hours over 12 weeks**

### 8.2 Hours per Week

| Week | Phase | Hours | Cumulative |
|------|-------|-------|------------|
| 1 | Secrets | 8 | 8 |
| 2 | Secrets | 10 | 18 |
| 3 | Secrets | 10 | 28 |
| 4 | Encryption | 4 | 32 |
| 5 | Buffer | 4 | 36 |
| 6 | Audit | 8 | 44 |
| 7 | Audit | 10 | 54 |
| 8 | Audit | 11 | 65 |
| 9 | Validation | 12 | 77 |
| 10 | Validation | 14 | 91 |
| 11 | Validation | 14 | 105 |
| 12 | Validation + Docs | 20 | 125 |
| Buffer | - | 22 | 147 |

**Average: ~12 hours/week**
**Range: 4-20 hours/week**

With 10-20 hrs/week available, this is achievable.

### 8.3 Milestones

**Week 3:** Secrets Management Complete
- All secrets in Vaultwarden
- Secrets rotated
- Documentation complete

**Week 5:** Encryption at Rest Complete
- Neon TDE verified
- Documentation complete

**Week 8:** Audit Logging Complete
- Transactional logging implemented
- Retention policy configured
- Documentation complete

**Week 12:** Input Validation Complete
- All routes validated
- Testing complete
- Full documentation suite ready

**Week 13+:** Buffer/Refinement
- Address any issues
- Improve documentation
- Prepare for due diligence

---

## 9. Rollback Strategy

### 9.1 Per-Phase Rollback

**Phase 1: Secrets Management**

If Vaultwarden fails in production:

1. **Immediate:**
   ```bash
   git revert <commit-hash>
   vercel deploy --prod
   ```

2. **Restore secrets to Vercel:**
   ```bash
   # From encrypted backup file
   cat secrets-backup.enc | openssl aes-256-cbc -d | \
   while read line; do
     KEY=$(echo $line | cut -d'=' -f1)
     VALUE=$(echo $line | cut -d'=' -f2)
     printf "$VALUE" | vercel env add $KEY production --force
   done
   ```

3. **Verify:**
   ```bash
   vercel logs --prod | grep -i error
   ```

**Phase 2: Encryption at Rest**

No rollback needed (configuration only, no code changes).

**Phase 3: Audit Logging**

If audit logging causes issues:

1. **Quick fix:** Disable sync logging temporarily
   ```typescript
   // Emergency: Make all logging async
   export const auditSync = auditAsync;
   ```

2. **Full rollback:**
   ```bash
   git revert <audit-logging-commits>
   vercel deploy --prod
   ```

**Phase 4: Input Validation**

If validation is too strict:

1. **Quick fix:** Add bypass flag (dev/staging only)
   ```typescript
   if (process.env.BYPASS_VALIDATION === 'true') {
     // Skip validation
   }
   ```

2. **Fix validation:** Adjust schemas to be less strict
3. **Full rollback:** Revert commits (not recommended - loses security)

### 9.2 Emergency Contacts

- **Technical Lead:** [Name, Phone, Email]
- **DevOps:** [Name, Phone, Email]
- **Security Officer:** [Name, Phone, Email]

### 9.3 Backup Strategy

**Before each phase:**
1. Tag git commit: `git tag phase-1-start`
2. Backup Vercel env vars to encrypted file
3. Database snapshot (Neon auto-snapshots daily)
4. Document current state

**After each phase:**
1. Tag git commit: `git tag phase-1-complete`
2. Update backup files
3. Test rollback procedure (in preview environment)

---

## 10. Success Criteria

### 10.1 Technical Metrics

- ✅ **Secrets:** 0 hardcoded secrets in code or .env files
- ✅ **Encryption:** 100% of data at rest encrypted (Neon TDE)
- ✅ **Audit Logging:** >95% of critical actions audited
- ✅ **Input Validation:** 100% of API routes validated (50/50)
- ✅ **Performance:** < 15% overhead from security controls
- ✅ **Tests:** >90% code coverage for new components

### 10.2 Compliance Metrics

- ✅ **SOC2 Score:** 75-80% (up from 40%)
- ✅ **Critical Gaps:** 4/5 addressed (Secrets, Encryption, Audit, Validation)
- ✅ **Documentation:** 8 policies + 2 diagrams + compliance matrix
- ✅ **Evidence:** Screenshots, certificates, logs collected

### 10.3 Business Metrics

- ✅ **Due Diligence Ready:** Can respond to VSAs with confidence
- ✅ **Customer Trust:** Demonstrate security controls to prospects
- ✅ **Risk Reduction:** CVSS 9.8 vulnerability (secrets) eliminated
- ✅ **Future-Ready:** Foundation for formal SOC2 audit (if needed)

### 10.4 Deliverables Checklist

**Code:**
- [ ] `src/lib/secrets.ts` - Vaultwarden SDK
- [ ] `src/lib/audit-v2.ts` - Reliable audit logging
- [ ] `src/lib/validation/` - Zod schemas (6 files)
- [ ] `src/lib/validate.ts` - Validation helpers
- [ ] 50 API routes migrated (validation)
- [ ] Server actions migrated (validation)

**Documentation:**
- [ ] `docs/security/01-security-overview.md`
- [ ] `docs/security/02-secrets-management.md`
- [ ] `docs/security/03-encryption-at-rest.md`
- [ ] `docs/security/04-audit-logging-policy.md`
- [ ] `docs/security/05-input-validation-guide.md`
- [ ] `docs/security/06-incident-response-plan.md`
- [ ] `docs/security/07-data-retention-policy.md`
- [ ] `docs/security/08-access-control-policy.md`
- [ ] `docs/security/architecture-diagrams/secrets-flow.png`
- [ ] `docs/security/architecture-diagrams/audit-logging-flow.png`
- [ ] `docs/security/compliance-matrix.md`

**Evidence:**
- [ ] Neon.tech encryption certificate
- [ ] Vaultwarden configuration screenshots
- [ ] Audit log sample exports
- [ ] Validation test results
- [ ] Performance benchmarks

**Tests:**
- [ ] Unit tests for secrets SDK
- [ ] Unit tests for audit logging
- [ ] Unit tests for validation schemas
- [ ] Integration tests for API routes
- [ ] E2E test scenarios (4)

---

## 11. Next Steps

### 11.1 Immediate (This Week)

1. **Review this design document**
2. **Get stakeholder approval**
3. **Set up project tracking** (GitHub Issues or similar)
4. **Prepare Vaultwarden access** (credentials, test connection)

### 11.2 Week 1

1. **Start Phase 1:** Secrets Management
2. **Set up development environment**
3. **Install dependencies** (Bitwarden SDK, async-queue, etc.)
4. **Create initial git branch:** `feat/soc2-phase-1-secrets`

### 11.3 After Implementation

Once all 4 phases are complete:

1. **Internal review:** Technical team reviews implementation
2. **Security audit:** External or internal security review (optional)
3. **Customer communication:** Update security page, respond to VSAs
4. **Continuous improvement:** Monitor, refine, enhance

### 11.4 Future Enhancements (Post-Phase 4)

**Phase 5 (Optional):**
- Rate limiting (Vercel Shield or custom middleware)
- WAF (Cloudflare or Vercel Shield)
- External audit logging (Datadog, Splunk)
- Hash chain for tamper-evident logs
- MFA enforcement (Entra ID Conditional Access)

**Phase 6 (Optional):**
- Formal SOC2 Type II audit preparation
- Penetration testing
- Bug bounty program
- Security training for team

---

## 12. Appendices

### Appendix A: Glossary

- **TDE:** Transparent Data Encryption
- **TSC:** Trust Services Criteria (SOC2 framework)
- **BAA:** Business Associate Agreement (HIPAA)
- **VSA:** Vendor Security Assessment
- **CVSS:** Common Vulnerability Scoring System
- **PII:** Personally Identifiable Information
- **PHI/ePHI:** Protected Health Information (electronic)

### Appendix B: References

- [SOC2 Trust Services Criteria](https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [CMMC Model](https://www.acq.osd.mil/cmmc/)
- [Bitwarden SDK](https://bitwarden.com/help/secrets-manager-sdk/)
- [Zod Documentation](https://zod.dev/)
- [Neon.tech Security](https://neon.tech/docs/security)

### Appendix C: Contact Information

- **Project Owner:** Andrés De Paula
- **Security Lead:** [TBD]
- **Compliance Officer:** [TBD]
- **External Auditor:** [TBD]

---

**Document Version:** 1.0
**Last Updated:** February 24, 2026
**Next Review:** May 24, 2026 (3 months)
**Status:** ✅ APPROVED - Ready for Implementation
