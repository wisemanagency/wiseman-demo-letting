// One-off migration to fix Sanity documents where PortableText blocks have
// `marks: ""` or `markDefs: ""` (empty strings) instead of `[]` (empty arrays).
//
// Root cause: when Sanity documents are created via the MCP `create_documents`
// tool (or any path that doesn't supply explicit empty arrays), the GROQ layer
// coerces missing `marks` / `markDefs` to empty strings on read. This crashes
// @portabletext/react v3 (silent empty body) AND the Studio block editor
// itself (`(e.leaf.marks ?? []).filter is not a function`).
//
// Run: node scripts/fix-portabletext-marks.mjs
// Run with --dry-run to print what would change without writing.

import { createClient } from "@sanity/client";

// ── Auth token ──
// Must be supplied via the environment. See .env.example for the variable
// name. Generate a fresh write-capable token in the Sanity dashboard
// (manage.sanity.io → API → Tokens) — never commit a token to this repo.
//
// This script intentionally does NOT fall back to ~/.config/sanity/config.json.
// That file holds the Sanity CLI's broad Studio auth and is not an appropriate
// credential source for a one-off migration script run from CI or a teammate's
// machine.
const TOKEN = process.env.SANITY_MIGRATION_TOKEN;
if (!TOKEN) {
  console.error(
    "[fix-portabletext-marks] SANITY_MIGRATION_TOKEN is not set.\n" +
      "  Generate a write-capable token at https://www.sanity.io/manage → API → Tokens,\n" +
      "  then either:\n" +
      "    • export SANITY_MIGRATION_TOKEN=... before running, or\n" +
      "    • put it in a local .env file (gitignored) and load it via your shell.\n" +
      "  Re-run with --dry-run first to preview without writing."
  );
  process.exit(1);
}

const PROJECT_ID = "4k3lxsgw";
const DATASET = "production";
const DRY_RUN = process.argv.includes("--dry-run");

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: "2024-01-01",
  token: TOKEN,
  useCdn: false,
});

// ── Define which fields per type are PortableText arrays ──
// Mirrors `sanity/schemas/*.ts` — checked manually for `of: [{ type: "block" }, ...]`.
const PORTABLE_TEXT_FIELDS = {
  post: ["body"],
  page: ["body"],
  property: ["description"],
  agent: ["bio"],
  area: ["description"],
};

// ── Stat counters ──
const stats = {
  documentsScanned: 0,
  documentsChanged: 0,
  fieldsChanged: 0,
  blocksChanged: 0,
  childrenChanged: 0,
  perDocument: [],
};

// ── Core normalizer ──
// Returns { changed: boolean, value: any }. If `value` is not a PortableText
// array (or already correct), `changed` is false and value is returned as-is.
function normalizeField(value) {
  if (!Array.isArray(value)) return { changed: false, value };
  let fieldChanged = false;

  const next = value.map((block) => {
    if (!block || typeof block !== "object") return block;
    const blockChange = {};

    // markDefs at the block level
    if ("markDefs" in block && !Array.isArray(block.markDefs)) {
      blockChange.markDefs = [];
      fieldChanged = true;
    }

    // children spans
    if (Array.isArray(block.children)) {
      const nextChildren = block.children.map((child) => {
        if (!child || typeof child !== "object") return child;
        if ("marks" in child && !Array.isArray(child.marks)) {
          return { ...child, marks: [] };
        }
        return child;
      });
      // Detect if any child actually changed
      const childrenChanged = nextChildren.some((c, i) => c !== block.children[i]);
      if (childrenChanged) {
        blockChange.children = nextChildren;
        fieldChanged = true;
      }
    }

    return Object.keys(blockChange).length > 0 ? { ...block, ...blockChange } : block;
  });

  return fieldChanged ? { changed: true, value: next } : { changed: false, value };
}

console.log(
  `[fix-portabletext-marks] ${DRY_RUN ? "DRY RUN" : "LIVE"} mode · project ${PROJECT_ID} / dataset ${DATASET}`
);

// Fetch every document of the affected types
const types = Object.keys(PORTABLE_TEXT_FIELDS);
const groqTypeList = JSON.stringify(types);
const query = `*[_type in ${groqTypeList}] { _id, _type, _rev }`;
const docs = await client.fetch(query);

console.log(`[fix-portabletext-marks] Fetched ${docs.length} documents`);

for (const doc of docs) {
  stats.documentsScanned++;
  const fields = PORTABLE_TEXT_FIELDS[doc._type] || [];
  const changes = {}; // path -> corrected value
  const fieldPaths = [];

  // For each PortableText field, fetch the raw value and normalize
  for (const fieldName of fields) {
    const raw = await client.fetch(`*[_id == $id][0]{ "${fieldName}": ${fieldName} }`, {
      id: doc._id,
    });
    const value = raw?.[fieldName];
    const { changed, value: fixed } = normalizeField(value);
    if (changed) {
      changes[fieldName] = fixed;
      fieldPaths.push(fieldName);
      stats.fieldsChanged++;
      // Count blocks/children touched for the audit
      const blockCount = fixed.length;
      const childCount = fixed.reduce(
        (acc, b) => acc + (Array.isArray(b.children) ? b.children.length : 0),
        0
      );
      stats.blocksChanged += blockCount;
      stats.childrenChanged += childCount;
    }
  }

  if (Object.keys(changes).length === 0) continue;

  stats.documentsChanged++;
  stats.perDocument.push({
    _id: doc._id,
    _type: doc._type,
    fields: fieldPaths,
  });

  const summary = `${doc._type} ${doc._id} → ${fieldPaths.join(", ")}`;

  if (DRY_RUN) {
    console.log(`  [dry-run] would patch ${summary}`);
    continue;
  }

  // Patch with `ifRevisionId` to avoid clobbering concurrent edits
  let patch = client.patch(doc._id).set(changes);
  if (doc._rev) patch = patch.ifRevisionId(doc._rev);
  await patch.commit();
  console.log(`  ✓ patched ${summary}`);
}

console.log("\n[fix-portabletext-marks] ── Summary ──");
console.log(`  documents scanned:           ${stats.documentsScanned}`);
console.log(`  documents changed:           ${stats.documentsChanged}`);
console.log(`  PortableText fields changed: ${stats.fieldsChanged}`);
console.log(`  blocks touched:              ${stats.blocksChanged}`);
console.log(`  spans touched:               ${stats.childrenChanged}`);
console.log(`  per-document breakdown:`);
for (const row of stats.perDocument) {
  console.log(`    - ${row._type} ${row._id} → ${row.fields.join(", ")}`);
}

if (DRY_RUN) {
  console.log(
    "\n[fix-portabletext-marks] DRY RUN — no writes performed. Re-run without --dry-run to apply."
  );
}
