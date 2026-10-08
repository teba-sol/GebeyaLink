<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Frontend rules (read before writing any UI)

1. **Read `docs/frontend-design-direction.md` first.** It is a standing product requirement: no generic SaaS/admin pattern (sidebar + header + stat cards + table + colored badges), no decorative agriculture imagery, role-distinct experiences, order journey as timeline/progress — not tables, status via shapes/typography/indicators, not just color badges.
2. **Read `docs/frontend-architecture.md`** for the approved phase plan, directory layout, data-access patterns, and decisions. Build only the current phase; do not build all screens at once.
3. **The visual language (typography, palette, composition, status/quantity language) is chosen once in the F0 Foundation phase** on 2–3 compared directions, then locked as the design system. Do not invent a new look per screen, and do not start F0 before the direction is approved.
4. **Establish/reuse `features/ui/` primitives and tokens before screens.** New UI goes in `features/<domain>/`, not `packages/ui`, not `app/`.
5. **Next.js conventions come from the bundled docs** at `node_modules/next/dist/docs/` (async `params`, `PageProps`/`LayoutProps`, `proxy.ts` not `middleware`, `preload` not `priority`, Tailwind v4 `@import 'tailwindcss'`) — do not guess from training data.
6. **UI authz mirrors server authz but is never trusted**: hide/gate actions by role + business state for UX; the API enforces the rule.
7. **Verification per screen**: `npm run lint`, `npm run typecheck`, vitest suite green, browser-automation visual QA (console clean + assertions) — do not ask humans to eyeball basics.
