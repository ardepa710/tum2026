# TUM 2026 - IT Admin Dashboard

## Repository
- URL: https://github.com/ardepa710/tum2026
- Local: /home/ardepa/tum2026

## Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS v4, Lucide React icons
- **Auth:** NextAuth.js v5 (Auth.js) — Microsoft Entra ID SSO
- **ORM:** Prisma 6 + PostgreSQL
- **Microsoft API:** @microsoft/microsoft-graph-client (client credentials flow)

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
│   └── graph.ts                # Microsoft Graph API client
└── middleware.ts                # Auth middleware for /dashboard/*
prisma/
└── schema.prisma               # User, Tenant, AutomationTask models
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

## Commands
- `npm run dev` — Development server
- `npx prisma migrate dev` — Run migrations
- `npx prisma studio` — Database GUI
- `npx prisma generate` — Generate Prisma client
