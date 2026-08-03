# Phase 2a — `.github/` + minimal CI

## Goal

Establish `.github/` as the canonical home for repo automation: PR templates, CI workflows, and phase-level PR body files. Wire the existing quality gates into a CI workflow that runs on every PR and every push to `main`.

## Why now

Phase 1 added the quality-gate scripts (`typecheck`, `check`, `check:all`, `build`). They are currently invoked manually pre-commit. With variant template forks coming, retrofitting CI across N repos is more expensive than wiring it into the scaffold once and letting forks inherit it.

## Changes

- **`.github/workflows/ci.yml`** — runs `npm ci` + `npm run typecheck` + `npm run check` + `npm run build` on `pull_request` events and on `push` to `main`. Uses Node from `.node-version` (currently `24`). Built-in npm cache. Concurrency group cancels stale PR runs but lets `main` pushes complete.
- **`.github/pull_request_template.md`** — minimal PR template enforcing atomic commits, local `check:all` + `build` gates, and the merge-commit-or-rebase-never-squash rule.
- **Relocation: `scripts/pr-body-phase-1.md` → `.github/pr-bodies/pr-body-phase-1.md`** — moves phase-level PR body files into `.github/` for organisational consistency. Removes the last Wiseman string from `scripts/`. History preserved via `git mv`.

## Convention going forward

Phase-level PR body files live at `.github/pr-bodies/pr-body-phase-<N>.md`. Future phases follow:

`gh pr create --body-file .github/pr-bodies/pr-body-phase-<N>.md`

## Repo state context

This is the first PR under the post-Phase-1 repo merge settings: `squashMergeAllowed: false`, `deleteBranchOnMerge: true`, `mergeCommitAllowed: true`, `rebaseMergeAllowed: true`. Merge strategy for this PR: merge-commit or rebase.

## Verification at PR head

- `npm run typecheck` → exit 0
- `npm run check` → exit 0 (expected: zero errors, zero warnings, 12 non-blocking hints carried from Phase 1 baseline)
- `npm run build` → exit 0 (expected: 16 pages from the scaffold-demo dataset)
- CI workflow runs on this PR itself — green on first attempt expected