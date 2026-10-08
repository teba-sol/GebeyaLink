# GebeyaLink Frontend Design Direction

This is a standing product requirement. It applies to every frontend change in this
repository. Read it before implementing any UI.

> **Design system locked (F0): Terra Market.** Warm cream paper, leaf-green
> accent, ochre attention, Bricolage Grotesque display + Plus Jakarta Sans body +
> IBM Plex Mono numerals, soft radii/cards, marketplace density, order journey as
> timeline. Tokens live in `apps/web/app/globals.css`; the reference renders at
> `/design-system` (fixture data, labeled "reference — not live data"). Everything
> below still applies on top of that system.

## GebeyaLink must NOT use a generic SaaS/admin-dashboard visual pattern

Do not design every screen as:

- persistent sidebar
- top header
- page title
- row of statistic cards
- generic table
- generic form
- colored status badges

That structure is technically fine, but it has no product identity. GebeyaLink must
not become another generic SaaS dashboard.

## Product identity

The frontend should have a distinctive product identity based on GebeyaLink's domain:

**B2B agricultural commerce + supply-chain operations + marketplace + logistics.**

Think:

- Agricultural commerce + supply-chain intelligence + modern B2B marketplace

rather than:

- generic admin dashboard + green colors.

Someone should see the application and immediately think:

> "This is an agricultural supply-chain platform."

not:

> "This is another Tailwind dashboard."

The visual identity should feel agricultural through the product's information
architecture and visual language, not through excessive leaves, farms, crops, or
stock photography. Avoid decorative agriculture imagery that does not communicate
information.

## Design principles

### Design each workflow around the user's job, not around database entities

Each screen should answer:

> What is the user's job here, and what visual/interaction pattern makes that job
> fastest and clearest?

### Use different interaction patterns for different roles

- **Buyer** → commerce/discovery experience
- **Cooperative Staff** → inventory/order/operations experience
- **Collection Agent** → fast, touch-friendly field workflow
- **Transporter** → simple mobile logistics workflow
- **Admin** → operational oversight

A buyer should not experience the same visual environment as a collection agent.

### Use domain-relevant visual patterns

- commodity and lot presentation
- quantity/weight visualization
- inventory availability
- supply/location context
- order journey/timeline
- transportation progress
- delivery confirmation
- dispute progression
- operational activity

Status must be expressed through shapes, typography, indicators and movement —
not just colored badges.

### Use modern web-product patterns where appropriate

- contextual navigation
- command/search interfaces
- progressive disclosure
- split views
- timeline views
- expandable detail panels
- map/location surfaces (only where they add meaning)
- dense operational views where necessary
- large commerce-oriented product/supply surfaces
- responsive bottom actions on mobile
- purposeful motion and transitions

### Do not force every page into the same layout template

Layout intent changes per workflow: large intentional whitespace, asymmetric
compositions where appropriate, dense data only where users actually need
operational density, strong typography hierarchy. Responsive layouts are designed
per workflow, not by shrinking desktop layouts.

### Establish a reusable design system first

Before implementing major frontend screens, establish the visual language and
reusable primitives: typography, spacing, surfaces, borders, elevation, status
language, controls, data visualization, responsive behavior, motion.

The design system should support a distinctive GebeyaLink visual identity rather
than looking like a default component-library implementation.

### Clarity over decoration

Prioritize clarity and operational usability over visual decoration.

## Important

The frontend must feel like a purpose-built agricultural supply-chain product.

Do not produce a generic "sidebar + header + cards + table" application simply
because that is the easiest dashboard pattern.

## Role experiences

- **Buyer** — marketplace-first: search commodities, filter by product/grade/
  location/quantity, commodity-focused product/listing pages, availability
  visualization, order creation, order journey, payment status, later transport
  and delivery tracking.
- **Cooperative Staff** — operations-first: inventory available to sell, incoming
  orders, orders awaiting acceptance, payment status, pickup preparation, later
  transport/delivery.
- **Collection Agent** — touch-friendly operational interface: collection center,
  select farmer, record weight, quality grade, accepted/rejected quantity,
  inventory contribution. This should eventually become the mobile/offline
  experience; offline sync is not immediate.
- **Transporter** — simple logistics workflow: assigned pickups, pickup details,
  confirm pickup, active deliveries, confirm delivery.
- **Admin** — system oversight: cooperatives, users/roles, marketplace health,
  transactions, disputes, operational metrics.

## How we build it

Do not build the frontend all at once — that is how we end up with a giant generic
dashboard. Instead:

1. **Frontend Foundation / Design System phase** — establish the visual language
   and reusable primitives first (with 2–3 directions to compare; the direction is
   chosen once and becomes the design system).
2. **One complete journey first** — Buyer → Marketplace → Listing → Order → Order
   status. Once that looks and feels right, replicate the visual language across
   cooperative, collection-agent, transporter, and admin experiences.
3. **C6 and C7 plug into the flows afterward** — transport/delivery UI, then
   disputes/audit UI.

Keep this document alongside the technical architecture
(`docs/frontend-architecture.md`).
