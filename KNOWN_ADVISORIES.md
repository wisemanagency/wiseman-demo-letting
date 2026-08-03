# Known Advisories

This file documents `npm audit` findings that are **knowingly accepted** in
the scaffold, with rationale and unblock paths. Variant forks inherit these
as starting context.

Last audited: 2026-06-23 (Phase 3c)
HEAD at audit: 7de7226

## Why accepted findings exist

`npm audit` reports against the resolved dependency tree, including deep
transitives we don't declare. For some findings, the "fix" offered is a
rollback (older version than what we have); for others, the patched version
lives in a major release we haven't migrated to yet. This file is the
ledger.

## Root — accepted findings

### Astro framework cluster (blocked by Astro 6+ migration)

The following findings all clear with the same migration: Astro 5.x → 6.x
or 7.x, plus coordinated bumps of the official adapters and integrations.

| Advisory | Package | Patched in | Notes |
|---|---|---|---|
| GHSA-j687-52p2-xcff | astro | 6.1.6 | No 5.x backport |
| GHSA-xr5h-phrj-8vxv | astro | 6.1.10 | No 5.x backport |
| GHSA-8hv8-536x-4wqp | astro | 6.3.3 | No 5.x backport |
| GHSA-jrpj-wcv7-9fh9 | astro | 6.4.6 | No 5.x backport |
| GHSA-2pvr-wf23-7pc7 | astro | 6.4.6 | No 5.x backport |
| GHSA-mr6q-rp88-fx84 | @astrojs/vercel | 10.0.2 | Peer-requires Astro 6+ |
| (transitive) | @vercel/routing-utils | via @astrojs/vercel 10+ | Cleared by adapter bump |
| (transitive) | path-to-regexp | via @astrojs/vercel 10+ | Cleared by adapter bump |
| (transitive) | esbuild | via astro 7.0.2 | Cleared by Astro bump |

**Why not migrated now:** Astro 6+ migration touches `@astrojs/react 4 → 6`,
`@astrojs/vercel 8 → 10/11`, plus SSR / `getStaticPaths` / Vercel adapter
verification across the scaffold. Non-trivial work that deserves a
dedicated phase, not a tail-end task on hygiene.

**Unblock path:** dedicated Astro 6+ migration phase.

### `@astrojs/check` chain

Affected packages: `@astrojs/check`, `@astrojs/language-server`,
`volar-service-yaml`, `yaml`, `yaml-language-server`.

**Rationale:** `@astrojs/check@0.9.9` is the latest published. No forward
fix exists. The audit's "fix" is a rollback to `0.9.2` — rejected. This is
a devDep used only for editor tooling and the `npm run check` gate; runtime
is unaffected.

**Unblock path:** wait for `@astrojs/check@0.9.10+` upstream, or the Astro
6+ migration phase which may pull in newer versions.

### Other transitive findings

`@babel/core`, `devalue`, `follow-redirects`, `js-yaml`, `postcss`, `tar`,
`vite` — all transitive, all chained to either Astro core or
`@astrojs/vercel`. These resolve via the Astro 6+ migration phase.

## Studio — accepted findings

The Studio (`sanity/`) audit reports 19 findings, all transitive
(`undici`, `ws`, `dompurify`, `postcss`, `js-yaml`, `uuid`, and others deep
in the Sanity dependency tree).

**Rationale:** `npm audit` suggests rolling Sanity back to `5.14.1`. This
is an audit pathology — the database tracks highest-known-fixed-version
per advisory; when 6.x patches don't yet exist, audit recommends a
backward 5.x point where a transitive happened to be patched at the time.
Following the recommendation would undo the Phase 3b bump *and* land us
on an older Sanity than we were on before (5.20.0).

The Studio is an embedded subpackage run on-demand by content editors —
not part of the public-facing runtime surface. Sanity ships weekly; these
transitives will drain naturally as 6.2, 6.3 etc. release.

**Unblock path:** routine Sanity minor releases. Re-audit periodically
(suggest quarterly) and refresh this file.

## Re-audit protocol

When refreshing this file:

1. `npm audit --json` at root
2. `cd sanity && npm audit --json && cd ..`
3. Update tables. Drop findings that have cleared. Add new findings.
4. Commit: `chore: refresh KNOWN_ADVISORIES.md (<date>)`