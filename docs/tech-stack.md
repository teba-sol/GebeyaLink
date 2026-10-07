# GebeyaLink — Technical Stack

## 1. Purpose

This document defines the approved technology stack and project architecture for the GebeyaLink MVP.

The coding assistant must use this stack when scaffolding the project.

This document defines **technical choices only**.

The business/product source of truth remains:

1. `docs/business-domain-model.md`
2. `docs/prd.md`
3. `docs/user-flows.md`
4. `docs/roles-and-permissions.md`

Do not change business rules or add features based on this document.

> Version: 2.0
> Revision: Initial version mandated Laravel + PHP. The stack was later revised by explicit project decision to **Next.js full-stack + Expo + PostgreSQL + Redis**. Business documents were not affected by this change.

---

# 2. Approved Architecture

GebeyaLink uses a monorepo containing:

* Web application (Next.js — UI **and** API)
* Mobile application (React Native + Expo)
* Shared packages where genuinely useful

```text
gebeyalink/
├── apps/
│   ├── web/                 # Next.js full-stack (UI + API + server logic)
│   ├── mobile/              # React Native + Expo application
│   │
├── packages/
│   ├── types/               # Shared TypeScript types where needed
│   ├── validation/          # Shared frontend validation where appropriate
│   ├── ui/                  # Shared UI components where appropriate
│   └── config/              # Shared configuration
│
├── docs/
│   ├── business-domain-model.md
│   ├── prd.md
│   ├── user-flows.md
│   ├── roles-and-permissions.md
│   └── tech-stack.md
│
├── .env.example
├── .gitignore
├── package.json
├── turbo.json
└── README.md
```

There is **no separate API application**. The Next.js application owns the web UI, the REST API (route handlers), and all server-side business logic.

The server-side code is organized by domain under:

```text
apps/web/server/
```

---

# 3. Web Application

## Framework

**Next.js** (App Router)

## Language

**TypeScript** (strict mode)

## Responsibilities

The web application provides:

* Web UI
* REST API (route handlers under `app/api/`)
* Server-side business logic
* Authentication
* Database access (Drizzle)

## Purpose

The web application primarily supports:

* Buyer
* Cooperative Staff
* GebeyaLink Admin

It must be structured to support role-based access.

## Requirements

* TypeScript strict mode
* Modern Next.js architecture (App Router)
* Clear separation between `app/` (routes), `features/` (client modules), and `server/` (server-only modules)
* API client abstraction on the client side
* Authentication-aware routing
* Role/permission-aware UI structure
* Environment-based configuration
* `server-only` code must never leak into client bundles

Do not implement business workflows during initial scaffolding.

---

# 4. Mobile Application

## Framework

**React Native**

## Tooling

**Expo**

## Language

**TypeScript** (strict mode)

## Primary User

The mobile application is primarily for:

**Collection Agent**

The Collection Agent workflow is offline-first.

The mobile architecture must therefore be prepared for:

* Local data storage
* Offline operation
* Pending synchronization
* Synchronization status
* Retry after connectivity returns
* Conflict/duplicate detection
* Failed synchronization recovery

Do not implement the complete synchronization/business workflow during initial scaffolding.

Only establish the technical foundation.

---

# 5. Backend

## Implementation

**Next.js server-side modules and route handlers**

All backend functionality lives inside the web application:

```text
apps/web/
├── app/
│   └── api/v1/...          # Thin route handlers (HTTP boundary only)
│
├── features/               # Client-facing feature modules
│
└── server/                 # Server-only modules (the backend)
    ├── db/                 # Drizzle client, schema, migrations
    ├── auth/               # Better Auth configuration
    ├── cache/              # Redis client
    │
    ├── cooperatives/
    ├── farmers/
    ├── inventory/
    ├── marketplace/
    ├── orders/
    ├── payments/
    ├── transportation/
    ├── delivery/
    ├── disputes/
    └── audit/
```

Route handlers stay thin: parse/validate the request, call a server module, return a typed response. Business logic lives in `server/`, never inside route handlers.

The backend will eventually handle:

* Authentication
* Authorization
* Business rules
* REST API
* Database access
* Validation
* Offline synchronization
* Background jobs
* Notifications
* Audit records
* File/object storage
* Transaction processing

The initial scaffold must establish this architecture without implementing the business workflows.

---

# 6. API

The API is a **REST API** exposed through Next.js route handlers under:

```text
/api/v1/...
```

Versioned from the start. Route handlers are thin; domain logic lives in `server/<domain>/`.

Response shape conventions (technical only):

```json
{ "data": ... }
{ "error": { "code": "...", "message": "..." } }
```

Do not implement all business modules during scaffolding.

---

# 7. Database

## Database

**PostgreSQL** (hosted on **Supabase**)

PostgreSQL is the authoritative server-side database.

It will eventually store:

* Users
* Cooperatives
* Farmers
* Collection records
* Inventory
* Listings
* Orders
* Payments
* Transportation
* Deliveries
* Disputes
* Audit history

The database must support:

* Relational data
* Foreign keys
* Transactions
* Constraints
* Indexing
* Historical records

Do not create the complete business database schema during initial scaffolding unless explicitly instructed. The only tables created during scaffolding are the authentication tables required by the chosen auth library.

---

# 8. Database Layer

Use:

**Drizzle ORM** (with `drizzle-kit`)

Drizzle is the approved ORM. It maps directly onto PostgreSQL and generates plain SQL migrations that are committed to the repository.

Use:

* Drizzle schema definitions
* Drizzle migrations / schema push
* Database transactions
* Typed queries

Avoid introducing a second ORM.

Supabase note: the project does not provide a second "shadow" database, so migrations are generated as SQL artifacts and applied directly. Application code always connects with the standard PostgreSQL connection string (session pooler).

Migration workflow (C1 confirmed): use `drizzle-kit generate` (`npm run db:generate -w web`) to produce versioned SQL under `server/db/migrations`, then apply the generated SQL to the pooler manually — execute each `--> statement-breakpoint` statement in the file with a `pg` client (`apps/web`'s `DATABASE_URL` in `apps/web/.env`). Avoid `drizzle-kit push`: on this project it deterministically re-proposes the existing auth unique indexes (`user_email_unique`, `session_token_unique`) and aborts with `relation ... already exists` every run, so statements after the failure point are never applied. Never edit a committed migration retroactively — add a new one instead.

Auth ids: Better Auth generates 32-char hex ids, so auth id/FK columns are `text` (not `uuid`). The `id` default is `gen_random_uuid()`. Domain tables use `uuid` ids and snake_case columns (see `server/db/schema/*.ts`).

Better Auth is configured with `emailAndPassword: { enabled: true, requireEmailVerification: false }` plus the `bearer()` and `nextCookies()` plugins. Sign-up/sign-in via email+password is therefore enabled.

---

# 9. Authentication

Use:

**Better Auth**

Better Auth stores users, sessions, and accounts in the application's own PostgreSQL tables.

It must support:

* Web: cookie-based sessions for the Next.js application
* Mobile: token-based (bearer) API authentication for the Expo application

The application must eventually support authenticated platform users such as:

* GebeyaLink Admin
* Cooperative Staff
* Collection Agent
* Buyer
* Transporter

## Important

**Farmer is NOT a platform user in MVP.**

Farmers do not receive platform accounts or login credentials.

A farmer is a business record managed by the cooperative/Collection Agent.

---

# 10. Authorization

Authorization must be separate from authentication.

Use server-side authorization guards implemented in `server/`:

* Role checks (the five approved platform roles only)
* Organization/ownership scope checks
* Business-state checks

Every protected action must satisfy:

```text
Authenticated User
        +
Correct Role
        +
Correct Organization / Ownership Scope
        +
Valid Business State
        =
Action Allowed
```

The approved permission rules are defined in:

```text
docs/roles-and-permissions.md
```

Do not invent additional roles or permissions.

---

# 11. Validation

Use **Zod** everywhere:

* Client-side: `packages/validation` for user-input validation
* Server-side: at the API boundary, before any business logic executes

The server-side Zod validation is authoritative. Frontend validation is a convenience only — never a security or correctness boundary.

---

# 12. API Responses

Route handlers must return explicitly typed, Zod-shaped responses.

Do not dump raw database rows or internal objects into responses.

Keep the boundary clean:

```text
Database Rows (Drizzle)
        ↓
Server Module output (typed)
        ↓
Route Handler response (Zod-shaped)
        ↓
Web / Mobile Applications
```

---

# 13. Offline Storage

The Collection Agent mobile application must support offline operation.

Use:

**SQLite** (via `expo-sqlite`)

for local mobile persistence.

The architecture should eventually support:

```text
Collection Agent
       ↓
Local SQLite
       ↓
Pending Sync
       ↓
Next.js API
       ↓
PostgreSQL
```

The server remains the authoritative source of truth.

The mobile database must not become the authoritative inventory system.

---

# 14. Synchronization

Offline synchronization will use an application-level synchronization layer between the mobile application and the API.

The architecture must eventually support:

* Retry
* Duplicate detection
* Conflict detection
* Sync status
* Failed synchronization retention
* Server-side validation

Conceptually:

```text
Mobile
  ↓
SQLite
  ↓
Pending Sync
  ↓
Next.js API
  ↓
Validation
  ↓
Duplicate / Conflict Check
  ↓
PostgreSQL
```

Do not fully implement the synchronization workflow during initial scaffolding.

Only prepare the architecture.

---

# 15. Cache and Background Jobs

## Cache

**Redis**

Redis is used for caching (and later as queue backing).

During scaffolding the Redis client and configuration are established only. There is no local Redis instance yet (see §20); live verification happens when local infrastructure is added.

## Background Jobs

When background processing becomes necessary, use a Node.js queue system backed by Redis (BullMQ is the expected choice).

No queue system is installed or configured during scaffolding — there are no background jobs yet. Add one when the first real background job exists.

---

# 16. Scheduled Tasks

There is no framework-level scheduler in Next.js.

Future scheduled operations (expired reservation processing, scheduled notifications, background maintenance) will run as standalone worker/cron entry points.

Do not implement these business processes during scaffolding.

---

# 17. File and Object Storage

Use:

**S3-compatible object storage**

Configuration (env vars) is established during scaffolding; application code should use an abstraction rather than a specific provider SDK spread across the codebase.

Eventually this may store:

* Delivery evidence
* Dispute evidence
* Documents
* Other uploaded files

Do not implement file workflows during initial scaffolding.

---

# 18. Testing

## Unit / Integration

**Vitest** for:

* Unit tests
* Server-module tests
* API/route tests

## Web E2E

**Playwright** for end-to-end testing of the web application.

## Mobile

Use the appropriate Expo/React Native testing approach when mobile testing is introduced.

The initial scaffold establishes testing infrastructure (runner configured, smoke tests only) without implementing the complete business test suite.

---

# 19. Code Quality

### TypeScript applications

* ESLint (flat config)
* Prettier
* TypeScript strict mode (`tsc --noEmit` must pass)

The repository must support common commands for:

```text
lint
format
typecheck
test
```

---

# 20. Local Development

Development commands:

```text
npm run dev        # web (Next.js)
npm run mobile     # Expo
npm run lint
npm run typecheck
npm test
```

## Local infrastructure (deferred)

Docker Compose with PostgreSQL and Redis was the planned local infrastructure. It is **explicitly deferred** by project decision and is not required for the current scaffold.

Current state:

* PostgreSQL: hosted Supabase project (remote)
* Redis: configured but not running locally; cache calls degrade gracefully until local Redis is added

The goal remains: make the entire project easy to start for a new developer.

---

# 21. Environment Configuration

Use environment variables for configuration.

Provide:

```text
.env.example        # root (placeholders only, committed)
apps/web/.env       # actual secrets (never committed; loaded by Next.js and drizzle-kit)
```

Never commit secrets.

Examples:

```text
DATABASE_URL                # Supabase PostgreSQL connection string (session pooler)
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL

REDIS_HOST
REDIS_PORT
REDIS_URL

AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION
AWS_BUCKET
AWS_ENDPOINT
```

Actual secrets must never be committed to Git.

---

# 22. Frontend Package Responsibilities

## `packages/types`

Contains genuinely shared TypeScript types.

Do not duplicate types unnecessarily.

## `packages/validation`

Contains shared Zod validation schemas where appropriate.

Server-side validation remains authoritative.

## `packages/ui`

Contains reusable UI components that genuinely need to be shared.

Do not force every component into this package.

Web-specific and mobile-specific components may remain inside their respective applications.

## `packages/config`

Contains shared configuration for the TypeScript applications (tsconfig, ESLint, Prettier).

---

# 23. Initial Project Structure

```text
gebeyalink/
│
├── apps/
│   ├── web/
│   │   ├── app/                 # App Router pages + api/v1 route handlers
│   │   ├── features/            # Client feature modules
│   │   ├── server/              # Server-only modules (db, auth, cache, domains)
│   │   └── ...
│   │
│   └── mobile/                  # React Native + Expo
│
├── packages/
│   ├── types/
│   ├── validation/
│   ├── ui/
│   └── config/
│
├── docs/
│   ├── business-domain-model.md
│   ├── prd.md
│   ├── user-flows.md
│   ├── roles-and-permissions.md
│   └── tech-stack.md
│
├── .env.example
├── .gitignore
├── package.json
├── turbo.json
└── README.md
```

---

# 24. Approved Technology Stack

| Area                     | Technology                     |
| ------------------------ | ------------------------------ |
| Web                      | Next.js (App Router)           |
| Web + API language       | TypeScript (strict)            |
| API                      | REST (Next.js route handlers)  |
| Mobile                   | React Native                   |
| Mobile tooling           | Expo                           |
| Mobile language          | TypeScript (strict)            |
| Backend                  | Next.js server modules         |
| Database                 | PostgreSQL (Supabase)          |
| ORM                      | Drizzle ORM                    |
| Database migrations      | Drizzle (SQL artifacts)        |
| Authentication           | Better Auth                    |
| Authorization            | Server-side guards (role/scope/state) |
| Validation               | Zod (client + server)          |
| API responses            | Typed, Zod-shaped responses    |
| Offline database         | SQLite (expo-sqlite)           |
| Cache                    | Redis                          |
| Background jobs          | Deferred (BullMQ expected)     |
| Scheduled jobs           | Deferred (worker/cron)         |
| Object storage           | S3-compatible storage          |
| Unit/integration testing | Vitest                         |
| Web E2E                  | Playwright                     |
| Package manager          | npm (workspaces)               |
| Monorepo                 | Turborepo                      |
| Local infrastructure     | Deferred (Docker Compose)      |

---

# 25. Scaffolding Rules

During the initial scaffolding phase:

## DO

* Create the monorepo (npm workspaces + Turborepo)
* Create the Next.js application (UI + API + server structure)
* Create the Expo application
* Configure PostgreSQL (Supabase) + Drizzle
* Configure Better Auth
* Configure authorization guard structure (no role-assignment logic)
* Configure Zod validation
* Configure Redis client configuration
* Configure SQLite foundation for mobile (no sync logic)
* Configure testing (Vitest + Playwright)
* Configure TypeScript strict mode
* Configure linting and formatting
* Configure environment variables
* Create the README
* Preserve all business documents unchanged
* Update this document when an approved technical decision changes

## DO NOT

Do not implement:

* Marketplace logic
* Inventory business logic
* Farmer delivery workflows
* Offline synchronization business logic
* Order workflows
* Reservation logic
* Cooperative acceptance/rejection logic
* Payment workflows
* Transportation workflows
* Pickup workflows
* Delivery workflows
* Dispute workflows
* Commission calculation
* Reputation calculations
* Notification business events
* Complex audit workflows
* Role-assignment / permission-logic beyond an inert role enum

Those will be implemented later from the approved business documents.

---

# 26. Source-of-Truth Rule

Before making implementation decisions, the coding assistant must read:

```text
docs/business-domain-model.md
docs/prd.md
docs/user-flows.md
docs/roles-and-permissions.md
docs/tech-stack.md
```

Business/product requirements take priority over technical implementation preferences.

If something is not defined in the business documents, do not invent a new business rule.

If something is technically undefined, use the simplest reasonable implementation that does not change the business requirements.

---

# 27. Definition of Done — Initial Scaffold

The initial scaffold is complete when:

* [ ] Monorepo is created
* [ ] npm workspaces work
* [ ] Turborepo works
* [ ] Next.js application starts
* [ ] Expo application starts
* [ ] API health endpoint responds
* [ ] PostgreSQL (Supabase) reachable
* [ ] Drizzle connects to PostgreSQL
* [ ] Auth schema migration applied
* [ ] Better Auth configured
* [ ] Redis client configured
* [ ] Environment configuration exists
* [ ] TypeScript passes
* [ ] Vitest tests run
* [ ] Playwright is configured
* [ ] Linting works
* [ ] Formatting works
* [ ] README explains setup and commands
* [ ] Existing business documents remain unchanged
* [ ] No unapproved business features have been implemented

Deferred by decision (not part of initial scaffold): Docker Compose, local Redis verification, background job queue, scheduled tasks.

---

# 28. Final Principle

**Scaffold first. Build business features second.**

The initial task is to create a clean, maintainable, runnable technical foundation for GebeyaLink.

Do not use scaffolding as an opportunity to introduce new product decisions.

After scaffolding is complete, stop and report:

1. What was created
2. Project structure
3. Technologies configured
4. Commands to run each application
5. Database/infrastructure setup
6. What remains intentionally unimplemented

Wait for explicit instruction before implementing the first business feature.
