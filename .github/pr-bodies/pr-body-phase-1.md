# Phase 1 — Scaffold sanitisation + hardening

This PR retcons `wiseman-template` from a Wiseman-branded build into a generic, white-label real-estate scaffold ready to be forked into client variants.

## Context

Phase 0 inventory established:

- The scaffold has been Sanity-driven from the initial commit. No hardcoded property fixtures at any point in history.
- "Wiseman" branding was contained to 6 non-runtime files (seed scripts, Studio config title, package name, lockfile, README shell snippet). Source under `src/` was already brand-clean — branding flows from the `siteSettings` Sanity singleton at runtime.
- Two `.cjs` migration scripts had a hardcoded Sanity write-token fallback in source. Token verified dead before this PR landed.
- A Wiseman client deployment uses Sanity project `3g6sb7og` separately. The scaffold should not default to it.
- Various dead config and orphan references accumulated over 14 commits of pre-history.

## What this PR does

Thirteen atomic commits, grouped into four logical phases:

**Group 1 — Security (commits 1–3)**
- Replace Wiseman seed data with generic scaffold-demo placeholders
- Remove hardcoded Sanity write-token fallback from floorplan scripts
- Replace hardcoded Sanity project ID `3g6sb7og` with the new `eyemedia-scaffold-demo` project (`itpavex8`)

**Group 2 — Brand sweep (commit 4)**
- Neutralise Wiseman references across `sanity/package.json`, Studio config title, `sanity/schemas/area.ts` placeholders, and README shell snippet

**Group 3 — Config cleanup (commits 5–9)**
- Remove dead `PUBLIC_MAPBOX_TOKEN` config
- Fix dangling `/placeholder-property.jpg` references (now point at existing SVG)
- Remove empty `sanity/schemaTypes/` stub directory
- Remove dead Leaflet CSS-injection fallback in `MapEmbed`
- Remove unused `glob@11` devDependency

**Group 4 — Quality gates + Node alignment (commits 10–13)**
- Add `typecheck` / `check` / `check:all` scripts to root `package.json`. Scope root tsconfig to stop tsc descending into `sanity/`. Install `@astrojs/check`. Fix a Recharts Formatter type error in `MortgageCalculator.tsx` that was previously masked.
- Align Node 24 LTS across `.node-version` and both `package.json` engines fields
- Refresh `sanity/package-lock.json` after the package rename in Group 2
- This PR body file (`scripts/pr-body-phase-1.md`)

## Baselines at PR head

All three quality gates pass clean:

- `npm run typecheck` — exit 0, zero errors
- `npm run check` — exit 0, zero errors, zero warnings, 12 hints (non-blocking)
- `npm run build` — exit 0, 16 pages built from the new scaffold-demo Sanity dataset

## What this PR does NOT do

The following are consciously deferred to later phases (see `CARRY_LIST.md`):

- Repo rename from `wiseman-template` to `real-estate-scaffold` (or similar) — separate PR after this lands
- Code duplication cleanup (Phase 2 hygiene): `formatPrice`/`statusLabel`/`statusColour` reimplemented in 3–4 components; three PropertyCard markup variants
- Real linter (ESLint or Biome) — Phase 1 uses `astro check` + `tsc --noEmit` only
- `astro check` hints — 12 non-blocking notices, mostly unused imports and two deprecation warnings
- Studio version drift — local Sanity 5.20.0 vs runtime 5.31.1
- npm audit findings (13 root + 22 Studio vulnerabilities, almost all transitive)
- Variant template forks (A: mortgage calculator, B: viewings booking, C: valuation request) — fork after this PR merges

## Sanity project layout post-PR

- Scaffold default: `eyemedia-scaffold-demo` (project ID `itpavex8`), dataset `production`, seeded with 1 branch, 3 areas, 3 properties, 2 agents, 1 siteSettings. All generic example data.
- Wiseman client deployment: `3g6sb7og`, dataset `production`. Lives entirely in the Wiseman client's own deployment context, not in this scaffold.
- Variant forks: override `SANITY_PROJECT_ID` / `SANITY_STUDIO_PROJECT_ID` via `.env` per deployment.

## Verification

After merge, smoke test:

1. Clone fresh, `cp .env.example .env`, populate `SANITY_PROJECT_ID=itpavex8`, run `npm install && npm run build` — should produce a green build with 16 pages from the demo dataset.
2. `cd sanity && npm install && npm run dev` — Studio should open showing the demo project's content.
3. `npm run check:all` from root — both gates green.
