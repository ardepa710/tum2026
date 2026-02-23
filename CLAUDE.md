# TUM 2026 - IT Admin Dashboard

## Repository
- URL: https://github.com/ardepa710/tum2026
- Local: /home/ardepa/tum2026

## Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **UI:** Tailwind CSS v4, Lucide React icons
- **Auth:** NextAuth.js v5 (Auth.js) — Microsoft Entra ID SSO
- **ORM:** Prisma 7 + PostgreSQL (Neon.tech prod, localhost dev)
- **Microsoft API:** @microsoft/microsoft-graph-client (client credentials flow)
- **NinjaOne RMM:** Client credentials OAuth2, global token cache
- **Sophos Central:** Partner API OAuth2, per-tenant routing with X-Tenant-ID + regional apiHost

## Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Redirect to /dashboard
│   ├── globals.css             # Tailwind + CSS variables (dark theme)
│   ├── login/page.tsx          # Microsoft SSO login
│   ├── api/auth/[...nextauth]/ # NextAuth API route
│   └── dashboard/
│       ├── layout.tsx          # Sidebar + Header layout
│       ├── page.tsx            # Dashboard overview
│       └── tenants/
│           ├── page.tsx        # Tenant list
│           ├── new/            # Create tenant form
│           └── [id]/           # Tenant detail
│               ├── layout.tsx  # Breadcrumb + tabs
│               ├── page.tsx    # Tenant overview
│               ├── users/      # AD users (Graph API)
│               ├── groups/     # AD groups (Graph API)
│               ├── licenses/   # MS licenses (Graph API)
│               └── tasks/      # Automation tasks (DB)
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   ├── tenant-form.tsx
│   └── tenant-tabs.tsx
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── prisma.ts               # Prisma client singleton
│   ├── graph.ts                # Microsoft Graph API client
│   ├── ninja.ts                # NinjaOne RMM API client
│   ├── ninja-utils.ts          # Client-safe NinjaOne helpers
│   ├── sophos.ts               # Sophos Central API client
│   ├── sophos-utils.ts         # Client-safe Sophos helpers
│   ├── types/ninja.ts          # NinjaOne TypeScript types
│   └── types/sophos.ts         # Sophos TypeScript types
└── middleware.ts                # Auth middleware for /dashboard/*
prisma/
└── schema.prisma               # User, Tenant, DeviceCrossLink, + more models
```

## Theme
Dark theme with CSS variables:
- Primary bg: #0f172a, Secondary: #1e293b
- Accent: #3b82f6 (blue)
- Success: #10b981, Warning: #f59e0b, Error: #ef4444

## Key Concepts
- **Tenants** are loaded manually into the DB (no self-registration)
- **AD Users/Groups/Licenses** are fetched on-demand via Graph API, NOT stored locally
- **Automation Tasks** are stored per tenant in PostgreSQL
- Each tenant has its own Azure App Registration credentials for Graph API access

## Environment Variables
See `.env.local.example` for required variables:
- DATABASE_URL, AUTH_SECRET, AUTH_URL
- AUTH_MICROSOFT_ENTRA_ID_ID, AUTH_MICROSOFT_ENTRA_ID_SECRET, AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
- GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET
- NINJA_CLIENT_ID, NINJA_CLIENT_SECRET
- SOPHOS_CLIENT_ID, SOPHOS_CLIENT_SECRET

## Commands
- `npm run dev` — Development server
- `npx prisma migrate dev` — Run migrations
- `npx prisma studio` — Database GUI
- `npx prisma generate` — Generate Prisma client
