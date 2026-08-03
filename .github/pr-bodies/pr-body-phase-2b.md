# Phase 2b — INCEPTION.md + repo rename

## Goal

Two related identity changes that belong together:

1. Add a scaffold-level `INCEPTION.md` that routes any incoming reader into one of two working modes: improving the scaffold itself, or spinning off a new variant template.
2. Align the repo's internal name with the renamed GitHub repository (`wiseman-template` → `real-estate-scaffold`).

## Why together

Both changes formalise the scaffold's identity. The rename makes the GitHub URL match what the scaffold actually is. The INCEPTION makes the *purpose* explicit at the repo's front door, so future-Bill (or future-Claude) opening the repo cold can't accidentally treat it as a client-deployable build.

## Changes

- **`INCEPTION.md`** (new, root) — Mode A/B/C router. Mode A: working on the scaffold itself. Mode B: spinning off a new variant. Mode C: wrong repo. Documents the two-Claude workflow, phase model, quality gates, and the variant fork procedure. Variant forks are expected to overwrite this file with their own client-deployment brief on Day 1.
- **`package.json` name field** — renamed from `real-estate-starter` to `real-estate-scaffold` to match the GitHub repo. `package-lock.json` regenerated via `npm install --package-lock-only` to mirror.
- **Remote URL** (config-only, not in commits) — updated from `wiseman-template.git` to `real-estate-scaffold.git`. GitHub auto-redirects old URLs, but local clone config now points at the canonical URL directly.

## Out of scope

- Sanity subpackage name (`real-estate-scaffold-studio`) — already correctly named, no change needed.
- Wiseman string sweep — Phase 1 already cleared all live references; only `.github/pr-bodies/pr-body-phase-1.md` retains them as the intentional migration doc.

## Verification at PR head

- `npm run typecheck` → exit 0
- `npm run check` → exit 0 (zero errors, zero warnings, 12 non-blocking hints, 34 files)
- `npm run build` → exit 0 (16 pages from the scaffold-demo dataset)
- CI green via `.github/workflows/ci.yml`

## Merge strategy

Merge-commit or rebase. Squash-merge is disabled at the repo level.
