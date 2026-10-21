# GebeyaLink Frontend Architecture & Plan

Status: **F0 in progress — direction locked (Terra Market)**. This document is
the working plan; edit it when a phase changes it. Companion to
`docs/frontend-design-direction.md`, which is the standing product requirement.

This document records the current state, the technical architecture, the design
system approach, the phase roadmap with review gates, and the API gaps to close
before C6. It exists so no session has to re-derive these decisions.

---

## 1. Current state & constraints

### What exists

- The web UI was greenfield; **F0 foundation is built**. `apps/web` has REST
  route handlers under `app/api/v1/` + better-auth (`app/api/auth/[...all]`).
- Styling: Tailwind v4 (`@import 'tailwindcss'`) with semantic tokens in
  `app/globals.css`; fonts via `next/font` (Bricolage Grotesque display, Plus
  Jakarta Sans body, IBM Plex Mono numerals). No component library — bespoke
  primitives in `features/ui/` only. No state/data-fetching/form/animation
  libraries yet.
- `features/` exists: `features/ui/` (primitives) and `features/design-system/`
  (reference screens + fixtures). Domain code lives in `apps/web/server/`
  (server-only). `packages/ui` (`@gebeyalink/ui`) is an intentional empty stub
  per `docs/tech-stack.md` §22 — web components belong in `apps/web`, shared
  ones only in `packages/ui`.
- Role shells are in place: role-gated layouts under `app/(auth)/`, `app/(buyer)/`,
  `app/(coop)/`, `app/(agent)/`, `app/(admin)/` (session + `user_roles` server-side
  redirect gates per §Auth). `/design-system` renders the locked token/reference page.
- Backend coverage (C1–C5) is complete through **payment confirmed**: auth/roles,
  cooperatives, collection centers, farmers, deliveries, inventory lots,
  marketplace listings (search/filter/CRUD), orders (place/accept/reject/expire/
  cancel with audit events), payments (submit/confirm/fail), products.
- Transport UI is **C6-gated** (no shipment data exists). Disputes + audit-read
  UI is **C7-gated**.

### Stack constraints (Next.js 16.3.8 / React 19.2.3)

From the bundled docs in `node_modules/next/dist/docs/` (read them, do not guess):

- Turbopack is the default bundler for `next dev` / `next build`; no flag needed.
- Root layout required; `PageProps<'/route'>` / `LayoutProps<'/route'>` are
  globally generated helpers (no import).
- `params`, `searchParams`, `cookies()`, `headers()` are **Promises** — await them.
- Server Components default; `'use client'` for client components; pass only
  serializable props from server → client.
- `metadata`/`generateMetadata` only in server components.
- Deprecated: `middleware` file → use **`proxy.ts`**; `runtime = 'edge'`;
  `next/image` `priority` → **`preload`**; single-arg `revalidateTag`; `next lint`
  command (use `eslint .` directly).
- Recommended CSS stack (docs `11-css.md`): **Tailwind for most styling + CSS
  Modules for component-specific styles**; global CSS only for truly global
  rules. Tailwind v4 setup: dev deps `tailwindcss` + `@tailwindcss/postcss`,
  `postcss.config.mjs` with `plugins: { '@tailwindcss/postcss': {} }`, and
  `@import 'tailwindcss';` in `globals.css`. No `tailwind.config.*` file.

### Repo mandates (`docs/tech-stack.md`)

- §3: separation of `app/` (routes) · `features/` (UI/client modules) ·
  `server/` (server-only); "API client abstraction on the client side";
  authentication-aware routing; **role/permission-aware UI structure**.
  Purpose: web primarily serves Buyer, Cooperative Staff, Admin.
- §9–§10: Better Auth cookie sessions on web; authorization is
  role + org/ownership scope + **valid business state** — the UI must mirror it
  (e.g., cancel button only while the order is still cancellable).
- §11: zod from `packages/validation` may be reused client-side as a convenience
  only — never a correctness boundary.
- §22: don't force components into `packages/ui`.
- Collection agent is mobile/offline-first (Expo + SQLite) long-term; we build a
  **responsive touch web experience now**, offline sync later.
- Testing bar: `lint` / `typecheck` / `test` (vitest) / `e2e` (Playwright).

---

## 2. Visual language — locked direction (F0 decision)

Three candidate directions were built on identical screens under a comparison
route and reviewed:

- **Field Ledger** — spare, publishing-like B2B intelligence (ledger sheets).
- **Terra Market** — warm cream paper, leaf-green accent, ochre attention,
  Bricolage Grotesque display + Plus Jakarta Sans body, marketplace density,
  soft radii/cards.
- **Trade Atlas** — editorial intelligence, cobalt + ochre.

**Chosen once: Terra Market. It is the GebeyaLink design system** for every
subsequent phase; the losing directions were deleted. Tokens live in
`apps/web/app/globals.css` (type, palette, status/semantic colors, shape,
elevation, responsive). The locked reference (tokens + primitives + five
fixture compositions: specimen, marketplace, listing, order journey, inventory
ops, collection agent) renders at **`/design-system`**, every composition
labeled *reference — not live data*. No re-litigating per screen.

---

## 3. Design system architecture

### Token layers (in `globals.css` / Tailwind v4 `@theme`)

- **Color**: ink/paper base (near-black text on warm off-white surfaces), a small
  set of commodity accents, a semantic status set (available / reserved /
  committed / dispatched / sold; pending / accepted / rejected / expired /
  cancelled; payment pending / confirmed / failed), destructive/attention.
  Tokens must be semantic (`--color-surface`, `--color-status-available`), not
  literal hues at call sites, so the chosen direction can retune globally.
- **Typography**: display/headline/body/caption scale + a numeric treatment for
  weights (kg/t) and money (birr) — tabular figures, mono where it aids scanning.
  Concrete families are an F0 output (via `next/font`); Geist is the placeholder.
- **Spacing / shape / elevation**: one spacing scale, radius scale, shadow/elevation
  scale (keep elevation rare — prefer borders and surface tone).
- **Motion**: durations + easings for transitions/entrances; purposeful only.
- **Responsive**: breakpoints per workflow; mobile-first base.

### Primitives inventory (first pass, in `features/ui/`)

Button (variants/sizes, incl. large touch targets), Text/Select/Textarea fields
with labels+errors, Dialog/Sheet, Tabs, Toast, **dense Table** and **ListRow**
patterns (both first-class), Card/Surface, Section header, Journey/Timeline
stepper, Availability meter (available/reserved/committed split bar),
Quantity/Weight display, Money display, Grade mark (A/B/C), Status mark
(shape + label + color), Deadline countdown (24h response window), Empty state,
Skeleton, Search bar, Filter chips, Pagination, Bottom action bar (mobile),
Page header, Role nav shells.

### Status & quantity language (domain-specific, not generic badges)

- Order journey: step/timeline component driven by status + timestamps
  (`createdAt`, `acceptedAt`, `rejectedAt`, `expiresAt`, payment attempts) —
  rendered as progression, not a colored pill in a table cell.
- Inventory states (AVAILABLE → RESERVED → COMMITTED → DISPATCHED → SOLD) get a
  consistent shape/color/label vocabulary reused in meters, tables, and detail.
- Quantities always carry unit context; availability shown as a split bar with
  numbers; MOQ surfaced wherever quantity is chosen.

### Layout language per role (shells differ — no single template)

- **Buyer**: editorial/commerce top-nav marketplace; large supply surfaces.
- **Cooperative staff**: operations console with contextual navigation; dense
  where operational (incoming orders with countdowns).
- **Collection agent**: full-screen touch stepper; big targets; bottom actions.
- **Transporter** (C6): simple mobile logistics workflow.
- **Admin**: oversight views; density where needed.

---

## 4. Technical architecture

### Directory layout

```
apps/web/
  app/
    (auth)/sign-in, sign-up, ...        auth screens
    (buyer)/marketplace, orders, ...    buyer shell
    (coop)/ops, inventory, orders, ...  cooperative shell
    (agent)/...                         touch shell
    (admin)/...                         oversight shell
    design-system/                      locked token + reference screens
    api/...                             existing route handlers (unchanged)
  features/
    ui/                                 design system (tokens usage, primitives)
    auth/  marketplace/  orders/  payments/  inventory/  collection/
    coop/  admin/                       each: components/ queries/ mutations/
  lib/
    api/                                typed API client for /api/v1
    session/                            server-side session/role helpers
  server/                               server-only domain (unchanged)
```

### Data access

- **Reads**: Server Components call server services directly (import from
  `../../server/...` behind `features/*/queries` — server-only, never shipped to
  the client). No HTTP hop for RSC data.
- **Mutations**: typed client (`lib/api`) against the existing `/api/v1` routes,
  then `revalidatePath` / `router.refresh()`. Zod input types from
  `packages/validation` reused for client-side convenience validation.
- Responses are the existing DTOs (`{ data }` / `{ error: { code, message } }`);
  never render raw rows.

### Auth & role-aware routing

- Session via better-auth on the server (`headers()`); role from `user_roles`.
- Each role group's `layout.tsx` enforces role server-side and redirects
  (`redirect()`); unauthenticated redirect via `proxy.ts` (Next 16 convention).
- UI gates mirror server authz: actions rendered only when role + scope + business
  state allow (buttons still re-checked server-side — UI gating is UX, not
  security).

### Styling decision

Tailwind v4 + CSS Modules for bespoke compositions + design tokens in
`globals.css` (matches bundled Next docs guidance). Component policy:
**custom-first visuals**; any third-party helper must be headless/unstyled
(consider only for dialog/select/combobox focus management + a11y), evaluated at
F0 start, and must be invisible in the final visual identity. No shadcn/default
component-library look.

### Testing & verification

- Existing: vitest (server/API), Playwright (`e2e/`), eslint, tsc.
- Per screen: **browser-automation skill** visual QA (renders, console clean,
  assertions on key content) — do not ask humans to "look at it" for basics.
- Per journey: Playwright e2e (buyer journey first).
- Component tests sparingly (only behavior-rich primitives).

### Explicit non-goals (now)

- Maps/location surfaces: the data model has free-text `location` only — no map
  until the data supports it.
- Dark mode: tokens will be dark-ready; not shipped initially.
- i18n: English; keep copy in tokens/constants so localization can land later.
- Offline: Expo app (separate track).
- Notifications UI: backend doesn't exist (P0 in PRD §35 — tracked as a gap).

---

## 5. Phase roadmap & review gates

| Phase | Scope | Gate |
|---|---|---|
| **F0 Foundation** | Tokens, primitives, role shells, Terra Market locked on `/design-system` reference (§2) | **Direction picked once → design system locked** |
| **F1 Buyer journey** | sign-in/up → marketplace browse/search/filter → commodity listing surface + availability viz → quantity/MOQ order creation → order journey timeline → payment attempt + status | Review stop; Playwright e2e for the journey |
| **F2 Cooperative ops** | inventory availability surfaces, listings management, incoming-orders board with 24h countdowns, accept/reject (reason dialog), payment confirm/fail, centers/farmers basics | Review stop |
| **F3 Collection agent (touch web)** | center select → farmer search/create → delivery capture stepper (claimed/measured/accepted/rejected + grade) → history | Review stop; touch/responsive QA |
| **F4 Admin** | cooperative verification queue, participants/transactions read views, config display; metrics when APIs exist | Review stop |
| **C6 plug-in** | transport arrangement (coop), transporter portal, shipment tracking, buyer delivery-confirmation; order journey extends | Own phase |
| **C7 plug-in** | disputes (open/respond/resolve), audit-trail view | Own phase |

Sequence rationale: C5 completes the core transaction, so F1 can build the real
buyer experience now; C6/C7 plug into flows afterward. Frontend problems can
influence API/DTO adjustments before the backend hardens.

### AI sourcing search (F1 enhancement)

Buyers can describe a need in plain language; `POST /api/v1/marketplace/ai-search/parse`
(buyer-only, `app/api/v1/marketplace/ai-search/parse/route.ts`) calls an
OpenAI-compatible or Gemini provider through `server/ai/provider.ts` and
validates the untrusted model output with `aiSourcingModelOutputSchema`
(`packages/validation`). The parsed criteria map 1:1 onto the **existing**
`listMarketplaceQuerySchema` filters (commodity → `productId`, grade →
`qualityGrade`, region → `location`, max price → `maxPrice`, requested quantity
→ `minAvailable`), so the client applies them through URL params and the current
server-rendered search returns the results — no second search path, no second
results grid. Requested quantity is a search filter ("lots with at least this
much on hand"), **never** a reservation; MOQ comes from configured business
parameters (`MIN_ORDER_QUANTITY_KG`), not the model. Env: `AI_PROVIDER` /
`AI_API_KEY` / `AI_MODEL` / `AI_BASE_URL` (+ `GEMINI_*`, see `.env.example`); a
missing key degrades gracefully (503) without breaking manual search. Redis
(when configured) provides best-effort rate limiting only.

### Sourcing recommendations (F1 enhancement)

`POST /api/v1/marketplace/ai-search/recommendations` (buyer-only, sibling route)
turns a request into *explainable* supplier recommendations over the real,
buyer-visible inventory. The pipeline is deliberately split so the language
model never decides anything a buyer could be misled by:

1. **Parse** (optional, LLM) — reuse `server/ai/sourcing.ts`; the `parse` route
   contract is unchanged.
2. **Eligibility** (pure code, `server/sourcing/eligibility.ts`) — mirrors the
   order-time rules in `server/orders/service.ts`: active listing, active
   cooperative, MOQ, plus product/grade/price-ceiling/quantity. A hard failure
   can never be outranked.
3. **Ranking** (pure code, `server/sourcing/ranking.ts`) — transparent weighted
   score (quantity .30 / price .25 / grade .20 / location .15 / completeness
   .10; weights are constants so the algorithm is auditable via
   `meta.algorithmVersion`). Missing data scores 0 *with its weight retained*,
   so unknown information is never an advantage; ties break deterministically.
4. **Evidence** (pure code, `server/sourcing/evidence.ts`) — every claim cites
   the field or calculation that produced it; only buyer-visible fields.
5. **Split sourcing** (pure code, `server/sourcing/split.ts`) — when no single
   supplier covers the request, propose a combination of real eligible lots,
   each at or above MOQ. It is a **proposal only** — it never reserves stock or
   creates orders.
6. **Explanation** (LLM, `server/ai/explain.ts`) — the model *explains* the
   already-computed result. Its output is Zod-validated and every evidence id is
   checked against the server-generated set (unknown references are dropped). If
   the provider fails or is unconfigured, a deterministic summary is returned and
   the request still succeeds (`explanation.source` = `deterministic`).

Proximity is scored from a **second third-party API**: Open-Meteo Geocoding
(`server/geo/geocoder.ts`, no key, cached + throttled; `GEOCODER_PROVIDER=off`
disables it). Free-tier licensing is non-commercial — documented in the solution
design. This route is read-only: it never mutates inventory.

---

## 6. API/DTO gap register

Needed by (not built yet — do not invent client-side workarounds):

| Gap | Needed by | Notes |
|---|---|---|
| Public config endpoint (MOQ, response window) | F1 (order form) | MOQ is env-only (`MIN_ORDER_QUANTITY_KG`); FR-018 says it must not be hardcoded in the UI |
| Buyer verification model + endpoints | F1/F4 | Ordering-requires-Approved (BR-001) has no data model yet; F1 shows account state only |
| `/users` list/roles endpoints | F4 | Admin participants view |
| Order events / audit **read** endpoint | F1 (richer) → C7 | F1 timeline composes from DTO timestamps + payment attempts; full audit trail read is C7 |
| Notifications backend + endpoints | post-F1 | PRD §35/§59 P0; no channel/infra exists |
| Metrics/aggregates endpoints | F4 | PRD §50/§51 dashboards (P1) |
| Market-price reference endpoints | later | PRD §14 (P1) |
| Shipments/transport endpoints | C6 | Entire transport UI |
| Dispute endpoints | C7 | Entire dispute UI |

Each gap is surfaced **before** the phase that needs it, so DTO adjustments land
while the backend is still fluid.

---

## 7. Definition of done (per phase)

1. `npm run typecheck` + `npm run lint` — no new issues beyond documented baseline.
2. Full vitest suite stays green (documented C3 failures in
   `tests/collection.test.ts` remain the only known failures).
3. Browser-automation visual QA passes for every new/changed screen (console
   clean, key assertions).
4. Playwright e2e for completed journeys (buyer journey in F1).
5. Review stop with the user before the next phase.
