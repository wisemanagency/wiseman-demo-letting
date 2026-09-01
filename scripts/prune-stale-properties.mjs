// One-off cleanup: remove the 6 for-sale / sold leftover properties from the
// original sales scaffold so the Studio matches the website (8 = 8).
//
// Before deleting, this script:
//   1. Lists the 6 target IDs with their titles/status for human review
//   2. Confirms zero inbound references from any other doc (related
//      properties, blog, testimonials, etc.)
//   3. Refuses to run unless `--confirm` is passed
//
// Image assets attached to these properties are NOT deleted — only the
// property docs themselves go. The licensed image library remains intact
// and reusable for new listings.
//
// Usage:
//   node scripts/prune-stale-properties.mjs            # dry-run, prints plan
//   node scripts/prune-stale-properties.mjs --confirm  # actually deletes

import { createClient } from "@sanity/client";
import fs from "fs";
import os from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import dotenv from "dotenv";

dotenv.config({ path: join(__dirname, "..", ".env") });

function resolveToken() {
  if (process.env.SANITY_TOKEN) return { token: process.env.SANITY_TOKEN, source: "SANITY_TOKEN" };
  if (process.env.SANITY_MIGRATION_TOKEN)
    return { token: process.env.SANITY_MIGRATION_TOKEN, source: "SANITY_MIGRATION_TOKEN" };
  const cliConfig = join(os.homedir(), ".config", "sanity", "config.json");
  if (fs.existsSync(cliConfig)) {
    const cfg = JSON.parse(fs.readFileSync(cliConfig, "utf8"));
    if (cfg.authToken) return { token: cfg.authToken, source: "sanity-cli-config" };
  }
  throw new Error("No Sanity token available.");
}

const { token, source } = resolveToken();

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "4k3lxsgw",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token,
  useCdn: false,
});

const confirm = process.argv.includes("--confirm");

// ── The 6 scaffold leftover IDs to prune ───────────────────────────────────────
// Each is for-sale or sold; none are referenced anywhere else in the dataset;
// none are rentals. Keeping them bloat the Studio and creates street-name
// collisions with the real letting inventory (e.g. Willow Drive + Riverside
// Quay each have a for-rent AND a for-sale listing).
const STALE_IDS = [
  "127a8c48-4af4-4ed8-8a63-0bbf87438090", // 1-bed Garden Mews, North — for-sale
  "20ad7cc0-ac58-4e4f-82cb-20a6ae2f02bd", // 3-bed Willow Drive, West — for-sale
  "5488a9d6-7426-4b0d-8e6d-dae5855f0add", // 5-bed Riverside Quay, West — for-sale
  "847349a2-9965-4872-8b52-0a41710f4e6a", // 4-bed Beech Hill, North — sold-stc
  "prop-3-bed-detached-sample-road-sampletown-north", // 3-bed Sample Road, North — for-sale
  "prop-4-bed-semi-example-lane-sampletown-west", // 4-bed Example Lane, West — sold
];

async function main() {
  console.log(
    `\n🧹 Pruning stale properties (token: ${source})${confirm ? "" : " [DRY RUN — pass --confirm to delete]"}\n`
  );

  // Pre-flight: confirm none of these are referenced anywhere else
  console.log("── Inbound-reference check ──");
  let unsafeCount = 0;
  for (const id of STALE_IDS) {
    const refs = await client.fetch(`*[references("${id}")]{_id, _type}`);
    const flag = refs.length === 0 ? "✓" : "✗";
    if (refs.length > 0) unsafeCount++;
    console.log(
      `  ${flag} ${id}: ${refs.length} inbound ref(s)${refs.length ? " — " + refs.map((r) => r._id).join(", ") : ""}`
    );
  }

  if (unsafeCount > 0) {
    console.log(`\n❌ Aborting — ${unsafeCount} doc(s) are still referenced. Resolve those first.`);
    process.exit(1);
  }

  // Summary
  const props = await client.fetch(
    `*[_id in $ids]{_id, title, status, "imageCount": length(images), "slug": slug.current} | order(title asc)`,
    { ids: STALE_IDS }
  );

  console.log("\n── Will delete ──");
  for (const p of props) {
    console.log(`  [${(p.status || "null").padEnd(10)}] ${p.slug}  — ${p.imageCount} images`);
  }

  if (!confirm) {
    console.log("\n⏸  Dry run. Re-run with --confirm to actually delete.");
    return;
  }

  // Delete
  console.log("\n── Deleting ──");
  let okCount = 0;
  let failCount = 0;
  for (const id of STALE_IDS) {
    try {
      await client.delete(id);
      console.log(`  ✓ ${id}`);
      okCount++;
    } catch (err) {
      console.log(`  ✗ ${id} — ${err.message}`);
      failCount++;
    }
  }

  // Verify
  const remaining = await client.fetch(`count(*[_type == "property"])`);
  const forRent = await client.fetch(`count(*[_type == "property" && status == "for-rent"])`);
  console.log(
    `\n✅ Done. ${okCount}/${STALE_IDS.length} deleted${failCount ? `, ${failCount} failed` : ""}.`
  );
  console.log(`   Remaining properties in dataset: ${remaining} (${forRent} for-rent)\n`);
}

main().catch((err) => {
  console.error("\n❌ Prune failed:", err.message);
  process.exit(1);
});
