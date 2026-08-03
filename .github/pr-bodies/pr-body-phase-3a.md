# Phase 3a — Biome adoption + full lint sweep

## Summary

Adopt Biome 2.5.1 as the scaffold's linter and formatter, then clear the full error surface across 11 atomic commits. Phase lands at 0 Biome errors, 0 warnings, 0 infos against `--max-diagnostics=500`.

## Linter decision

Biome 2.5.1 selected over ESLint flat config. Reasons:

- Single-tool formatter + linter (no plugin matrix)
- Faster runtime than ESLint + Prettier combo
- Simpler config surface
- Native Astro + TSX support without plugins

Carry-list "Linter selection" item now closed.

## Commits

| # | Hash | Subject |
|---|---|---|
| C1 | `c07289e` | Install @biomejs/biome@2.5.1 and add format/lint/biome scripts |
| C2 | `587596b` | Add biome.json config for Biome 2.5.1 linter and formatter |
| C3 | `dbd9016` | Add .gitattributes enforcing LF line endings |
| C4 | `30b7bc9` | Apply Biome safe auto-fixes across scaffold (formatting + lint) |
| C5 | `55a4891` | Scope useTemplate and useNodejsImportProtocol off for scripts/ |
| C6 | `cadaccc` | Apply mechanical a11y fixes: label bindings, button types, iframe titles, decorative SVGs (first pass) |
| C7 | `e7d776b` | Apply mechanical a11y fixes: SVG aria-hidden, button types, label→span, video caption track (second pass) |
| C8 | `6bd483b` | Apply interactive a11y fixes: semantic upgrades, key handlers, and per-site ignores |
| C9 | `9c105d9` | Apply TypeScript hygiene fixes: proper types, null guards, mechanical cleanup |
| C10 | `0c53d20` | Apply React correctness fixes: stable refs, effect splits, hook ordering, array keys |
| C11 | `be39126` | Apply Biome format autofix: SVG attribute wrapping |

## Notable architectural improvements

Beyond pure lint compliance, several commits surfaced and resolved latent issues:

- **Modal backdrops (FloorplansViewer, ImageGallery)** — refactored from generic clickable `<div>`s to `role="dialog"` with click-outside target checks. Semantically correct for modals; avoids the invalid nested-button HTML that a naive `role="button"` upgrade would have introduced.
- **MapSearch init effect (C9)** — split from a single `[]`-deps effect into an init-once effect plus a separate view-sync effect. Fixed a latent bug where prop changes to center/zoom were silently ignored after mount, without regressing the "create map once, preserve markers" behavior.
- **Leaflet marker timer state (C9)** — proper typing of `markersRef` surfaced custom-property usage (`marker._closeTimer`) that had been masked by `any`. Replaced with module-level `WeakMap<LeafletMarker, Timeout>` — decouples timer state from third-party types cleanly.
- **Recharts Cell deprecation (C9)** — migrated from `<Cell>` child elements to the `fill` prop on chart data. One of the 12 `astro check` hints carried from earlier phases, cleared incidentally.
- **Conditional hook (C10)** — `FloorplansViewer` had a `useEffect` after an early-return, a Rules of Hooks violation. Moved above the early return with an internal guard. Real bug fix, not just lint quietening.

## Per-site decisions worth recording

- **`useMediaCaption`** — scaffold video has no captions file. Added a placeholder `<track kind="captions" srcLang="en" label="English captions" />` so client variants can supply later. Suppression rots; placeholder doesn't.
- **`noLabelWithoutControl` on Recharts segments** — these are display labels, not form labels. Fixed by `<label>` → `<span>`, not `htmlFor`.
- **Synthetic placeholder keys (ImageGallery)** — empty slots have no stable ID. Kept `key={`empty-${i}`}` with `biome-ignore` rationale. Static keys would cause React duplicate-key warnings.
- **MultiImageUpload drag-state divs** — sibling file input button provides the a11y affordance for upload; sibling Remove button does the same for delete. Drag-state divs are imperative wiring, not user-activated UI. `biome-ignore` per-site with rationale.

## Quality-gate state at PR HEAD (`be39126`)

| Gate | Exit | Output |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm run check` | 0 | 0 errors, 0 warnings, 7 hints |
| `npm run build` | 0 | 16 pages, ~6.5s |
| `npx biome check . --max-diagnostics=500` | 0 | 0 errors, 0 warnings, 0 infos |

The `astro check` hint count dropped from 12 (Phase 1 baseline) to 7 as a side effect of C9 cleanup (removed unused imports/vars; Recharts Cell deprecation cleared). Remaining 7 hints are still out of Phase 3a scope and carried forward.

## Out of scope (still on carry list)

- 7 remaining `astro check` hints (deprecated `FormEvent` + `is:inline` script suggestions)
- `npm audit fix` (13 root + 22 Studio vulnerabilities)
- Studio version bump (`^5.20.0` → `5.31.1`)
- Code-duplication cleanup (`formatPrice`, `statusLabel`, `statusColour`, PropertyCard)

## Merge strategy

Merge-commit (not squash — repo-enforced via `squashMergeAllowed: false`). Branch auto-deletes on merge via `deleteBranchOnMerge: true`.
