# Phase 3b — Deps + tooling hygiene

## Scope

Two concerns from the carry list, addressed in one PR:

1. Clear the 7 remaining `astro check` hints (carried from Phase 1, reduced 12 → 7 as a side effect of Phase 3a).
2. Bump Sanity Studio from 5.20.0 → 6.1.0 (closes carry-list item "Studio version drift").

Deferred to a future Phase 3c: root `npm audit` remediation (17 findings, all requiring `--force` major bumps; needs per-package scoping). Pre-bump recon showed every audit finding requires `--force`, which is too much blast radius to bundle with the Studio major upgrade. Splitting keeps the bisect surface small.

## Commits

- `2895dd8` — Clear remaining astro check hints: is:inline, FormEvent import, unused symbols
- `34039e1` — Bump Sanity Studio 5.20.0 -> 6.1.0 (sanity + @sanity/vision)

## Astro check hints (7 → 0)

Per-site fixes:

| File:Line | Fix |
|---|---|
| `src/components/Breadcrumbs.astro:42` | Add `is:inline` to `<script>` |
| `src/components/ContactForm.tsx:20` | `FormEvent` → `SyntheticEvent` (React 19.2 deprecated both `FormEvent` and `FormEventHandler` as type aliases; `SyntheticEvent` is the non-deprecated base type and resolves both call sites) |
| `src/components/PropertyCard.astro:3` | Remove unused `urlFor` import |
| `src/components/PropertyCard.astro:2` | Remove `propertySummary` from named import |
| `src/components/SEOHead.astro:12` | Remove unused `siteUrl` declaration |
| `src/components/SEOHead.astro:37` | Add `is:inline` to `<script type="application/ld+json">` |
| `src/layouts/Base.astro:54` | Add `is:inline` to inline GA script |

`astro check` baseline now 0 errors / 0 warnings / **0 hints** (was 0/0/7).

## Sanity Studio 5.20.0 → 6.1.0

Co-bumped `sanity` and `@sanity/vision` to `^6.1.0` (peer-dep constraint required co-bump).

Pre-bump recon confirmed:
- No `auth.mode` config (removed in v6) — n/a
- No `enableLegacySearch` config (removed in v6) — n/a
- No custom Vite config in `sanity.cli.ts` — Vite 8 upgrade transparent
- All v6 peer deps satisfied by current direct deps (react 19.2.4, react-dom 19.2.4, styled-components 6.1.18, node 24.17.0)

Side effects of the bump:
- Studio now on Vite 8.1.0 (was Vite 7.x via Sanity 5.20.0)
- React Strict Mode default flips to `true` (latent; no breakage observed in dev or build)
- Studio vuln count 22 → 19 (severity mix shifted; remaining 19 deferred to Phase 3c)
- Studio dev server ready in 1.37s; production build 4.67s

## Quality gates at PR head

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run check` | exit 0 — 0 errors / 0 warnings / 0 hints |
| `npx biome check . --max-diagnostics=500` | exit 0 — 0/0/0 |
| `npm run build` | exit 0 — 16 pages, 6.27s |
| `cd sanity && npm run build` | exit 0 — 4.67s |

## Not in this phase

- Root vuln remediation (17 findings, all `--force`) — Phase 3c
- Studio vuln remediation beyond the version bump (19 remaining) — Phase 3c
- Code-duplication cleanup (`formatPrice`, `statusLabel`, `statusColour`, PropertyCard) — Phase 4
- Variant template forks — next phase after 3c
- Adding Biome to CI — carry-list operational item
- Local repo directory rename — carry-list operational item

All remain on `CARRY_LIST.md`.
