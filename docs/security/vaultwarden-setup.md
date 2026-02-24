# Vaultwarden Setup for TUM2026

**Status:** In Progress
**Last Updated:** 2026-02-24
**Owner:** Security Team

## Overview

TUM2026 uses Vaultwarden (self-hosted Bitwarden) for centralized secrets management to achieve SOC2 compliance.

## Prerequisites

Before proceeding with this setup, you need:

1. **A running Vaultwarden instance**
   - Self-hosted or managed Vaultwarden server
   - HTTPS enabled (required for web vault)
   - Admin access to create organizations

2. **Vaultwarden URL**
   - Example: `https://vault.yourdomain.com`
   - This URL will be added to `.env.local` as `VAULTWARDEN_URL`

> **Note:** If you don't have a Vaultwarden instance yet, you need to deploy one first. See "Deploying Vaultwarden" section below for guidance.

---

## Organization Structure

Once you have access to your Vaultwarden instance, create the following structure:

### Organization Details
- **Organization Name:** TUM2026
- **Organization Type:** Personal/Business (as appropriate)
- **Billing Email:** Your admin email

### Collections

Create two collections within the TUM2026 organization:

#### 1. Production Secrets
- **Purpose:** Secrets used in production/deployed environments
- **Access:** Read-only for service account
- **Items:** ~13 items (see Secret Inventory below)

#### 2. Development Secrets
- **Purpose:** Local development secrets (localhost DATABASE_URL)
- **Access:** Read-only for service account
- **Items:** ~2 items

---

## Service Accounts

### TUM2026-App (Primary Service Account)

**Purpose:** Application runtime access for retrieving secrets programmatically

**Configuration:**
1. Navigate to: Organization Settings → Service Accounts
2. Create new service account: "TUM2026-App"
3. **Permissions:**
   - Read access to "Production Secrets" collection
   - Read access to "Development Secrets" collection
4. Generate API key (save securely)
5. Copy the following to `.env.local`:
   - `VAULTWARDEN_CLIENT_ID` (service account ID)
   - `VAULTWARDEN_CLIENT_SECRET` (API key)

**Security Notes:**
- API key should be stored only in `.env.local` (never committed)
- Rotate API key every 90 days
- Monitor service account usage via audit logs

---

## Secret Inventory

The following secrets need to be migrated from `.env.local` to Vaultwarden:

### Production Secrets Collection (13 items)

| Secret Name | Current Value Source | Purpose | Rotation Schedule |
|-------------|---------------------|---------|-------------------|
| `AUTH_SECRET` | `.env.local` | NextAuth JWT signing key | 90 days |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | `.env.local` | Azure SSO client ID | 180 days |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | `.env.local` | Azure SSO client secret | 180 days |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | `.env.local` | Azure tenant ID | Never (ID only) |
| `GRAPH_CLIENT_ID` | `.env.local` | Microsoft Graph API client ID | 180 days |
| `GRAPH_CLIENT_SECRET` | `.env.local` | Microsoft Graph API client secret | 180 days |
| `NINJA_CLIENT_ID` | `.env.local` | NinjaOne RMM API client ID | 180 days |
| `NINJA_CLIENT_SECRET` | `.env.local` | NinjaOne RMM API client secret | 180 days |
| `SOPHOS_CLIENT_ID` | `.env.local` | Sophos Central API client ID | 180 days |
| `SOPHOS_CLIENT_SECRET` | `.env.local` | Sophos Central API client secret | 180 days |
| `DATABASE_URL` | `~/.claude/.secrets.env` (TUM2026_NEON_URL) | Neon.tech production DB connection | 365 days |
| `AUTH_URL` | `.env.local` | NextAuth callback URL (production) | Never (URL only) |
| `AUTH_TRUST_HOST` | `.env.local` | NextAuth trust host flag | Never (config) |

### Development Secrets Collection (1 item)

| Secret Name | Current Value Source | Purpose | Rotation Schedule |
|-------------|---------------------|---------|-------------------|
| `DATABASE_URL` | `.env.local` | Local PostgreSQL connection | Never (localhost) |

---

## Migration Steps

For each secret listed above:

1. **Log in to Vaultwarden web vault**
   - Navigate to your Vaultwarden URL
   - Sign in with your credentials

2. **Navigate to TUM2026 Organization**
   - Switch to "Organizations" view (top-right dropdown)
   - Select "TUM2026"

3. **Create new item**
   - Click "New Item" button
   - Select appropriate collection (Production or Development)
   - **Item Type:** Login
   - **Name:** Exact secret name (e.g., "AUTH_SECRET")
   - **Username:** Leave blank (not used)
   - **Password:** Paste secret value from `.env.local` or `.secrets.env`
   - **Notes:** Add metadata:
     ```
     Added: 2026-02-24
     Last Rotated: Never
     Purpose: [Brief description]
     Source: .env.local (or .secrets.env)
     ```

4. **Save and verify**
   - Click "Save"
   - Verify the item appears in the correct collection

5. **Repeat for all secrets**

---

## Access Control

### Current Access

- **Owners:** [Your email address]
- **Service Accounts:**
  - TUM2026-App (read-only access to both collections)

### Adding Additional Users (Future)

When onboarding team members:

1. Invite user to organization (email invitation)
2. Assign appropriate role:
   - **Manager:** Full access (for security team)
   - **User:** Read-only access (for developers)
3. Grant access to specific collections based on role
4. Document access in this file

---

## Deploying Vaultwarden (If Needed)

If you don't have a Vaultwarden instance yet, here are deployment options:

### Option 1: Docker (Recommended for testing)

```bash
# Pull official Vaultwarden image
docker pull vaultwarden/server:latest

# Run Vaultwarden
docker run -d \
  --name vaultwarden \
  -v /vw-data:/data \
  -p 8080:80 \
  vaultwarden/server:latest

# Access at http://localhost:8080
```

**Note:** This is HTTP-only. For production, you MUST use HTTPS (see Option 2).

### Option 2: Production Deployment (HTTPS Required)

Vaultwarden requires HTTPS for web vault access. Options:

1. **VPS with reverse proxy (nginx/Caddy)**
   - Deploy on VPS (e.g., DigitalOcean, Linode)
   - Use Caddy (automatic HTTPS) or nginx + Let's Encrypt
   - Configure domain (e.g., `vault.yourdomain.com`)

2. **Docker Compose with Traefik**
   - Traefik handles automatic HTTPS with Let's Encrypt
   - See: https://github.com/dani-garcia/vaultwarden/wiki/Using-Docker-Compose

3. **Managed hosting (Easiest)**
   - Some providers offer managed Vaultwarden hosting
   - Paid option but no server maintenance required

### Recommended: Quick HTTPS setup with Caddy

```bash
# Install Caddy (Ubuntu/Debian)
sudo apt install -y caddy

# Caddyfile
vault.yourdomain.com {
    reverse_proxy localhost:8080
}

# Start Vaultwarden
docker run -d --name vaultwarden \
  -v /vw-data:/data \
  -p 127.0.0.1:8080:80 \
  vaultwarden/server:latest

# Start Caddy
sudo systemctl restart caddy
```

---

## Security Considerations

1. **HTTPS is mandatory**
   - Web vault will NOT work without HTTPS
   - API endpoints require HTTPS for production

2. **Admin token**
   - Set `ADMIN_TOKEN` environment variable for admin panel access
   - Generate with: `openssl rand -base64 32`

3. **Backups**
   - Vaultwarden stores data in `/data` directory
   - Backup this directory regularly
   - Encrypted exports are available in web vault

4. **Firewall**
   - Restrict access to Vaultwarden server
   - Only allow HTTPS (port 443)

---

## Testing Connectivity

Once your Vaultwarden instance is set up, test connectivity:

```bash
# Check server status (replace with your URL)
curl -I https://your-vaultwarden-instance.com

# Expected: HTTP 200 OK
```

---

## Next Steps

After completing this setup:

1. ✅ Vaultwarden instance is running and accessible
2. ✅ TUM2026 organization is created
3. ✅ Collections are created (Production Secrets, Development Secrets)
4. ✅ All secrets are migrated to Vaultwarden
5. ✅ Service account TUM2026-App is created with API key
6. ⏭️ Proceed to Task 1.2: Install Bitwarden SDK in the application
7. ⏭️ Create `SecretsManager` utility to fetch secrets at runtime
8. ⏭️ Update `.env.local` to use Vaultwarden for secret fetching

---

## Troubleshooting

### Cannot access web vault
- Verify HTTPS is enabled
- Check DNS resolution for your domain
- Verify firewall allows port 443

### Service account API key not working
- Verify API key was copied correctly (no extra spaces)
- Check service account has read permissions to collections
- Verify `VAULTWARDEN_URL` in `.env.local` matches your instance

### Secrets not syncing
- Check network connectivity from app to Vaultwarden
- Verify service account permissions
- Check Vaultwarden logs: `docker logs vaultwarden`

---

## References

- Official Vaultwarden Wiki: https://github.com/dani-garcia/vaultwarden/wiki
- Bitwarden SDK Documentation: https://bitwarden.com/help/secrets-manager-sdk/
- SOC2 Secrets Management Best Practices: https://vanta.com/products/soc-2
