# Phase 3c — Advisory triage + accepted-findings ledger

## Scope reframe

The original Phase 3c scope was mechanical `npm audit` remediation. Pre-flight
recon killed it: every audit "fix" was either a rollback (Sanity 6.1.0 →
5.14.1, `@astrojs/check` 0.9.9 → 0.9.2) or required a major framework
migration (Astro 5.x → 6.x or 7.x) too large to bundle with hygiene.

Phase 3c reshapes into **formal documentation** of the accepted findings
plus creation of the Astro 6+ migration as a future dedicated phase.

## What shipped

Single substantive commit, plus PR body file:

- `e0856f4` — `docs: add KNOWN_ADVISORIES.md ledger for accepted audit findings`

Step 2 (`@astrojs/vercel` bump) was **skipped** per Step 1 recon: no
Astro-5-compatible version of `@astrojs/vercel` clears GHSA-mr6q-rp88-fx84
(the fix lands in 10.0.2, which peer-requires Astro 6). Folds into the
Astro migration cluster.

## What 3c documents

### Root audit (17 findings, all accepted)

| Cluster | Findings | Unblock |
|---|---|---|
| Astro framework cluster (5 core + @astrojs/vercel + 3 transitives) | 9 | Astro 6+ migration phase |
| `@astrojs/check` chain (no forward fix exists; audit suggests rollback) | 5 | upstream `@astrojs/check` 0.9.10+ or Astro migration |
| Other transitives (`@babel/core`, `devalue`, `follow-redirects`, `js-yaml`, `postcss`, `tar`, `vite`) | 7 | Astro migration phase |
| **Subtotal root** | **17** | (note: audit collapses some clusters — totals reconcile via KNOWN_ADVISORIES.md) |

### Studio audit (19 findings, all accepted)

All transitive. `npm audit` suggests rolling Sanity back to `5.14.1` —
audit pathology (highest-known-fixed-version heuristic when no 6.x patch
exists yet), not real security advice. Held pending routine Sanity minor
releases; not currently exploitable on the public-facing runtime surface.

Full ledger at [KNOWN_ADVISORIES.md](../../KNOWN_ADVISORIES.md).

## Quality gates at PR HEAD

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run check` | exit 0 — 0 errors / 0 warnings / 0 hints (34 files) |
| `npx biome check . --max-diagnostics=500` | exit 0 — 0/0/0 (37 files checked, no fixes applied) |
| `npm run build` | exit 0 — 16 pages, 10.73s |
| `cd sanity && npm run build` | exit 0 — 2790ms |

## Carry-list updates (for strategy chat to apply)

- **Drop** "Scaffold Phase 3c — vuln remediation" from Next (scoped + shipped, with reframe).
- **Add to Next:** "Astro 6+ migration phase" — clears the 5 Astro core advisories + `@astrojs/vercel` adapter + cascade of transitives. Touches `@astrojs/react 4 → 6`, `@astrojs/vercel 8 → 10/11`, plus SSR / `getStaticPaths` / Vercel adapter verification across the scaffold. Sized after Variant A ships, to be scoped against Astro latest at that time.
- **Update** root npm audit carry entry: 17 findings, all accepted + documented in `KNOWN_ADVISORIES.md`.
- **Update** Studio npm audit carry entry: 19 findings, all accepted + documented in `KNOWN_ADVISORIES.md`. Held pending Sanity minor releases.
- **Add Operational:** "Re-audit cadence — refresh `KNOWN_ADVISORIES.md` quarterly or when a relevant minor ships."

## Not in this phase

- Astro 6+ migration (deferred — see carry-list update above).
- Root audit mechanical remediation (would require Astro migration or unforced rollbacks — both rejected).
- Studio audit mechanical remediation (audit suggestions are rollbacks — rejected).
- Variant template forks (next phase after this one).
- Code-duplication cleanup (`formatPrice`, `statusLabel`, `statusColour`, PropertyCard) — still on carry list.
- Adding Biome to CI — carry-list operational item.
- Local repo directory rename — carry-list operational item.

## Merge strategy

Merge-commit (not squash — repo-enforced via `squashMergeAllowed: false`).
Branch auto-deletes on merge via `deleteBranchOnMerge: true` + explicit
`--delete-branch` flag on the merge command.
