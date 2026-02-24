# Task 1.1 Checklist: Vaultwarden Setup

**Task:** Set Up Vaultwarden Organization (2 hours)
**Status:** In Progress
**Date Started:** 2026-02-24

---

## Prerequisites

- [ ] Vaultwarden instance is running and accessible via HTTPS
- [ ] You have admin access to the Vaultwarden instance
- [ ] You have noted the Vaultwarden URL: `___________________________`

> If you don't have a Vaultwarden instance yet, see "Deploying Vaultwarden" section in `vaultwarden-setup.md`

---

## Step 1: Create Organization

- [ ] Log in to Vaultwarden web vault
- [ ] Click "New Organization" button
- [ ] Set name: "TUM2026"
- [ ] Complete organization creation
- [ ] Note organization ID (if visible): `___________________________`

---

## Step 2: Create Collections

### Production Secrets Collection
- [ ] Navigate to organization → Collections
- [ ] Click "New Collection"
- [ ] Name: "Production Secrets"
- [ ] Save collection
- [ ] Note collection ID (if visible): `___________________________`

### Development Secrets Collection
- [ ] Click "New Collection"
- [ ] Name: "Development Secrets"
- [ ] Save collection
- [ ] Note collection ID (if visible): `___________________________`

---

## Step 3: Create Service Account

- [ ] Navigate to Organization Settings → Service Accounts
- [ ] Click "New Service Account"
- [ ] Name: "TUM2026-App"
- [ ] Description: "Application runtime access (read-only)"
- [ ] Save service account
- [ ] Grant permissions:
  - [ ] Read access to "Production Secrets" collection
  - [ ] Read access to "Development Secrets" collection
- [ ] Generate API key
- [ ] Copy service account ID (Client ID): `___________________________`
- [ ] Copy API key (Client Secret): `___________________________`
- [ ] Save these credentials securely (you'll add them to `.env.local` in Task 1.2)

---

## Step 4: Migrate Secrets to Vaultwarden

### Production Secrets (13 items)

Each item should be created as a "Login" type with:
- **Name:** Exact environment variable name
- **Username:** (leave blank)
- **Password:** Secret value
- **Notes:** Added date, last rotation, source

#### AUTH_SECRET
- [ ] Create item "AUTH_SECRET"
- [ ] Value from `.env.local`: `dev-secret-change-in-production-tum2026`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### AUTH_MICROSOFT_ENTRA_ID_ID
- [ ] Create item "AUTH_MICROSOFT_ENTRA_ID_ID"
- [ ] Value from `.env.local`: `712af184-04f5-46b7-be83-21a0abaf5a24`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### AUTH_MICROSOFT_ENTRA_ID_SECRET
- [ ] Create item "AUTH_MICROSOFT_ENTRA_ID_SECRET"
- [ ] Value from `.env.local`: `REDACTED_AUTH_SECRET`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
- [ ] Create item "AUTH_MICROSOFT_ENTRA_ID_TENANT_ID"
- [ ] Value from `.env.local`: `fa959f21-7c68-4042-8eed-9f25a2db5c6e`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### GRAPH_CLIENT_ID
- [ ] Create item "GRAPH_CLIENT_ID"
- [ ] Value from `.env.local`: `7d3375e7-ba4d-4fb0-a461-ed0cf119a32d`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### GRAPH_CLIENT_SECRET
- [ ] Create item "GRAPH_CLIENT_SECRET"
- [ ] Value from `.env.local`: `REDACTED_GRAPH_SECRET`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### NINJA_CLIENT_ID
- [ ] Create item "NINJA_CLIENT_ID"
- [ ] Value from `.env.local`: `18YW9AEu6KNzweaLpqB74e-7rwg`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### NINJA_CLIENT_SECRET
- [ ] Create item "NINJA_CLIENT_SECRET"
- [ ] Value from `.env.local`: `PxFXXFVY4c5cLphz3dWPAOTN3dM_q75fmYwsXhb-0hFk7NmynP01IQ`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### SOPHOS_CLIENT_ID
- [ ] Create item "SOPHOS_CLIENT_ID"
- [ ] Value from `.env.local`: `9034d0e1-a00a-4a52-87e0-46df183c58cf`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### SOPHOS_CLIENT_SECRET
- [ ] Create item "SOPHOS_CLIENT_SECRET"
- [ ] Value from `.env.local`: `92bbab1e93542b255b02ef63077d573bc003b9d2811cf216d57b45cf28c20dd6da20db32c00872f646a22b3af37453ed9c2a`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .env.local"

#### DATABASE_URL (Production - Neon.tech)
- [ ] Create item "DATABASE_URL"
- [ ] Value from `~/.claude/.secrets.env`: `postgresql://neondb_owner:npg_w3JEDmH5kzMV@ep-sparkling-poetry-aikhqdc6-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Last rotated: never, Source: .secrets.env (Neon.tech)"

#### AUTH_URL (Production)
- [ ] Create item "AUTH_URL"
- [ ] Value: TBD (will be Vercel deployment URL, e.g., `https://tum2026.vercel.app`)
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, Production callback URL"

#### AUTH_TRUST_HOST
- [ ] Create item "AUTH_TRUST_HOST"
- [ ] Value: `true`
- [ ] Collection: Production Secrets
- [ ] Notes: "Added 2026-02-24, NextAuth config flag"

---

### Development Secrets (1 item)

#### DATABASE_URL (Development - localhost)
- [ ] Create item "DATABASE_URL_DEV"
- [ ] Value from `.env.local`: `postgresql://postgres:postgres@localhost:5432/tum2026?schema=public`
- [ ] Collection: Development Secrets
- [ ] Notes: "Added 2026-02-24, Local development only"

> **Note:** In Task 1.2, we'll configure the app to fetch `DATABASE_URL_DEV` when `NODE_ENV=development` and `DATABASE_URL` (production) when in production.

---

## Step 5: Verify Setup

- [ ] All 13 items exist in "Production Secrets" collection
- [ ] 1 item exists in "Development Secrets" collection
- [ ] Service account "TUM2026-App" has read access to both collections
- [ ] API credentials are saved securely
- [ ] Vaultwarden URL is noted: `___________________________`

---

## Step 6: Update Documentation

- [ ] Update `vaultwarden-setup.md` with actual:
  - Vaultwarden URL
  - Organization ID (if available)
  - Service account details
  - Admin email

---

## Step 7: Add Credentials to .env.local (DO THIS IN TASK 1.2)

This will be done in Task 1.2 when installing the Bitwarden SDK. For now, just keep the credentials safe.

Required additions to `.env.local`:
```bash
# Vaultwarden
VAULTWARDEN_URL=https://your-vaultwarden-instance.com
VAULTWARDEN_CLIENT_ID=<service-account-id>
VAULTWARDEN_CLIENT_SECRET=<api-key>
```

---

## Completion Criteria

- [x] Documentation created (`vaultwarden-setup.md`)
- [ ] Vaultwarden organization "TUM2026" exists
- [ ] Collections created (Production Secrets, Development Secrets)
- [ ] Service account created with API key
- [ ] All secrets migrated (14 total: 13 production, 1 dev)
- [ ] Credentials saved securely for Task 1.2

**When all checkboxes are complete, Task 1.1 is done!**

---

## Notes & Issues

**Date:** 2026-02-24
**Issue:** Need to deploy Vaultwarden instance first or confirm existing instance URL.

**Resolution:**
- Option 1: Deploy locally with Docker for testing (http://localhost:8080)
- Option 2: Deploy on VPS with HTTPS for production
- Option 3: Use existing Vaultwarden instance (if available)

**Next Steps:**
1. Confirm Vaultwarden deployment approach
2. Complete manual steps above
3. Proceed to Task 1.2 (Install Bitwarden SDK)

---

**Last Updated:** 2026-02-24
