# INCEPTION — Real Estate Scaffold

**Stop. Read this before you do anything in this repo.**

This file is a router. It tells you what this repo is, what mode you should be working in, and where to go next.

---

## What this repo is

This is the **real-estate scaffold**: a generic, white-label Astro + Sanity + Vercel platform template. It is the upstream source for a family of feature-divergent variant templates (target: 12), each of which is forked from this scaffold and then specialised for a client deployment.

This scaffold itself is **NOT** client-deployable. It produces a generic demo site backed by the `eyemedia-scaffold-demo` Sanity project (`itpavex8`). It has no client INCEPTION because there is no client.

Identity: EyeMedia Ltd (London) — agency operating EyeMedia Studios, EyeMedia Creative Agency, ClinicSEO, SmileConnect.ai.

---

## Which mode are you in?

Pick one. The rest of the file branches from this answer.

### Mode A — You're improving the scaffold itself

You're here because:
- A bug, gap, or duplication exists in the scaffold and needs fixing
- A new feature should land in the scaffold so future variant forks inherit it
- Infrastructure, tooling, or documentation needs work

**→ Go to "Working on the scaffold" below.**

### Mode B — You're spinning off a new variant template

You're here because you want a new client-facing variant — e.g. a mortgage-calculator variant, a viewings-booking variant, a valuation-request variant.

**→ Go to "Spinning off a new variant" below.**

### Mode C — You opened this repo by mistake

If you're trying to work on an existing variant deployment, you're in the wrong repo. Each variant lives in its own repository (e.g. `real-estate-variant-mortgage`). Find that repo and read its own `INCEPTION.md`.

If you're trying to work on the Wiseman Holidays project, that's a completely separate stream with its own scaffold and its own holiday-let template. This is the real-estate scaffold — close this and open the right one.

---

## Working on the scaffold (Mode A)

**Goal:** improve the scaffold itself. Changes land on `main` and are inherited by future variant forks.

**Working pattern — two-Claude workflow:**

- Open a **strategy chat** in the project's Claude project. It carries the standing context (`PROJECT_CONTEXT.md`, `CARRY_LIST.md`).
- Implementation is dispatched to **Claude Code (CC)** in the VS Code terminal via paste blocks fenced with `↓↓↓ PASTE TO CLAUDE CODE ↓↓↓` / `↑↑↑ END PASTE ↑↑↑`.
- CC executes against the brief, runs the quality gates, reports back. Strategy chat reviews, then acks the next step.

**Phase model:**

- Work is grouped into numbered phases (Phase 1, Phase 2a, Phase 2, etc.) each scoped to a single concern.
- Phases ship via PR with a body file at `.github/pr-bodies/pr-body-phase-<N>.md`.
- Commits are atomic — one logical change per commit, `git add <path>` (never `git add .`).
- PRs merge via merge-commit or rebase, **NEVER** squash. Repo settings enforce this.
- Branches auto-delete on merge.

**Quality gates (run before every commit):**

```
npm run typecheck
npm run check
npm run build
```

All three must exit 0. Baselines at HEAD of `main`: zero errors, zero warnings, 12 non-blocking hints, 16 pages built. Regressions are blockers.

**Standing context lives in:**

- `PROJECT_CONTEXT.md` — invariants, stack, environment, communication preferences
- `CARRY_LIST.md` — deferred items, resolved decisions, open product decisions
- `.github/pr-bodies/` — full PR bodies for each phase shipped

**Before dispatching any work:** read both context files. State must match. If it doesn't, halt and report.

**CI:** every PR and every push to `main` runs `.github/workflows/ci.yml` — typecheck + check + build on Node 24. Red CI blocks merge.

---

## Spinning off a new variant (Mode B)

**Goal:** create a new variant template repo, forked from this scaffold, specialised for a specific feature module, and configured for a client deployment.

**Pre-requisites:**

- The scaffold is at green baseline (`main` builds clean, all gates pass).
- The variant naming convention is resolved (see `CARRY_LIST.md` "Open product decisions"). Until resolved, do not fork.
- The variant's feature module has been scoped (e.g. mortgage calculator, viewings booking, valuation request).

**Variant fork procedure:**

1. Open a **strategy chat** in a new Claude project dedicated to the variant. Do NOT use the scaffold's project — variants are codebase-isolated and context-isolated.
2. Create a new GitHub repo using this scaffold as a template (GitHub's "Use this template" button), naming per convention.
3. Clone the new repo locally.
4. Author the variant's own `INCEPTION.md` — replacing this file. The variant's INCEPTION is a **client-deployment brief**: deployment target, Sanity project ID, brand identity, feature module specification, success criteria.
5. Create a new Sanity project for the variant. Update the 4 runtime/CLI defaults (`sanity/sanity.cli.ts`, `sanity/sanity.config.ts`, `scripts/add-floorplans.cjs`, `scripts/migrate-floorplans.cjs`) to point at it.
6. Seed the variant's Sanity project with client-specific or per-variant demo data.
7. Implement the feature module as the first phase of work on the variant.
8. Set up the variant's Vercel deployment pointing at the variant's Sanity project.

**What carries over from the scaffold:**

- The two-Claude workflow, phase model, commit/PR protocol, quality gates
- `.github/workflows/ci.yml` and `.github/pull_request_template.md`
- Repo merge settings (no-squash, delete-on-merge) — verify these are set on the new repo
- The stack, schemas, components, and styling

**What does NOT carry over:**

- Identity (`Wiseman` is not the scaffold's brand and is not a variant's brand)
- Sanity project IDs (each variant has its own)
- The scaffold's `PROJECT_CONTEXT.md` and `CARRY_LIST.md` (the variant authors its own from scratch)
- The scaffold's `INCEPTION.md` — this file. Replaced by the variant's own.

---

## Quick reference — invariants

The full list lives in `PROJECT_CONTEXT.md`. The non-negotiables:

- **Stack:** Astro 5.2 + Sanity v5 + Vercel, React 19 islands, Tailwind v4, TypeScript 5.7, Leaflet
- **Node:** 24 LTS (pinned via `.node-version` and `engines.node`)
- **Sanity project (scaffold default):** `eyemedia-scaffold-demo` / `itpavex8`
- **Brand source:** runtime, from the Sanity `siteSettings` singleton — never hardcoded in `src/`
- **Merge strategy:** merge-commit or rebase, NEVER squash
- **Commit discipline:** atomic, `git add <path>` only

---

## If in doubt

Halt. Open the strategy chat. Don't guess.
