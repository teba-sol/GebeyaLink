# GebeyaLink

Managed agricultural B2B marketplace — monorepo technical foundation.

This repository currently contains the **scaffolding only**. Business features are implemented later from the approved documents in [`docs/`](docs/).

## Source of truth

| Document | Purpose |
| --- | --- |
| [`docs/business-domain-model.md`](docs/business-domain-model.md) | Domain model |
| [`docs/prd.md`](docs/prd.md) | Product requirements |
| [`docs/user-flows.md`](docs/user-flows.md) | User flows |
| [`docs/roles-and-permissions.md`](docs/roles-and-permissions.md) | Roles and permissions |
| [`docs/tech-stack.md`](docs/tech-stack.md) | Approved technology stack and architecture |

## Stack

| Area | Technology |
| --- | --- |
| Monorepo | npm workspaces + Turborepo |
| Web (UI + API + server) | Next.js 16 (App Router), TypeScript strict |
| Mobile | React Native + Expo SDK 57, TypeScript strict |
| Database | PostgreSQL (Supabase), Drizzle ORM |
| Authentication | Better Auth (cookies on web, bearer on mobile) |
| Cache | Redis (configured, degrades gracefully when absent) |
| Offline storage | SQLite (`expo-sqlite`) |
| Validation | Zod |
| Testing | Vitest (unit/integration), Playwright (web E2E) |

## Structure

```text
gebeyalink/
├── apps/
│   ├── web/          # Next.js — UI, REST API (/api/v1), server modules (server/)
│   └── mobile/       # Expo app — offline-ready foundation (src/db, src/api)
├── packages/
│   ├── types/        # Shared TypeScript types (API envelope, …)
│   ├── validation/   # Shared Zod schemas
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configuration
├── docs/             # Business + tech source of truth
├── .env.example      # Environment template (placeholders)
├── package.json
└── turbo.json
```

## Prerequisites

- Node.js >= 20 (developed on v24)
- npm 11+ (`packageManager` field pins npm 11.16)
- A Supabase project (PostgreSQL connection string, session pooler)
- For mobile: a physical device with Expo Go, USB debugging enabled

## Setup

```sh
npm install
cp .env.example apps/web/.env      # then fill in real values
```

`apps/web/.env` is gitignored. Required for database commands:

- `DATABASE_URL` — Supabase session-pooler connection string
- `BETTER_AUTH_SECRET` — generate with `npx @better-auth/cli secret`
- `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `EXPO_PUBLIC_API_URL`

Redis (`REDIS_*`) and S3 (`AWS_*`) variables are optional during development; the code degrades gracefully when they are unset.

## Commands

| Command | What it does |
| --- | --- |
| `npm run web` | Next.js dev server (http://localhost:3000) |
| `npm run mobile` | Expo dev server (Metro) |
| `npm run lint` | ESLint across all workspaces |
| `npm run typecheck` | `tsc --noEmit` across all workspaces |
| `npm test` | Vitest unit/integration tests |
| `npm run test -w apps/web -- --watch` | Vitest watch mode |
| `npm run e2e -w apps/web` | Playwright E2E (boots the dev server itself) |
| `npm run format` / `npm run format:check` | Prettier write/check |
| `npm run db:generate` | Generate SQL migration artifacts (Drizzle) |
| `npm run db:push` | Push schema to the Supabase database |

Run `npx next typegen -w web` first if `tsc --noEmit` reports missing `LayoutProps` types.

## API

REST, versioned from the start: `/api/v1/...`, served by Next.js route handlers.

Response envelopes:

```json
{ "data": ... }
{ "error": { "code": "...", "message": "..." } }
```

Current endpoints: `GET /api/v1/health` and the Better Auth handler under `/api/auth/*`.

## Current state

Scaffolding done:

- Monorepo, linting, formatting, TypeScript strict, Turborepo pipelines
- Drizzle schema for the Better Auth tables (auth only — no business tables)
- Better Auth instance (web cookies + mobile bearer), Redis client
- Health endpoint with smoke tests (Vitest + Playwright)
- Mobile: versioned SQLite migration runner (empty) + typed API client stub

Intentionally **not** implemented yet: all business workflows (marketplace, inventory, orders, payments, transportation, delivery, disputes, audit), authorization guards beyond the inert foundation, offline synchronization, background jobs, file storage.

Deferred by decision: Docker Compose, local Redis verification.

## License

Private — see `apps/mobile/LICENSE` for the Expo template license notice.
