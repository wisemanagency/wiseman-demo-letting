// Read-only GROQ audit: distribution of `status` values across all property
// documents in the production dataset. Used to size the impact of switching
// to letting-only inventory (Phase 1 of the pure-letting conversion).
//
// Usage:  node scripts/audit-property-status.mjs

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

const counts = await client.fetch(
  `*[_type == "property"]{_id, status, title, town, rentPerMonth} | order(_createdAt asc)`,
  {},
  { cache: "no-store" }
);

console.log(`\n📊 Property status distribution (token source: ${source})\n`);
console.log(`Total properties: ${counts.length}\n`);

const byStatus = counts.reduce((acc, p) => {
  const k = p.status ?? "(missing)";
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});

console.log("By status:");
for (const [status, n] of Object.entries(byStatus).sort()) {
  const tag =
    status === "for-rent" || status === "let-agreed" || status === "let"
      ? "✅ letting"
      : "❌ sale-only";
  console.log(`  ${status.padEnd(14)} ${String(n).padStart(3)}  ${tag}`);
}

const lettingStatuses = ["for-rent", "let-agreed", "let"];
const lettingCount = counts.filter((p) => lettingStatuses.includes(p.status)).length;
const saleCount = counts.length - lettingCount;
console.log(`\nLetting total (for-rent + let-agreed + let): ${lettingCount}`);
console.log(`Sale-only total (everything else):             ${saleCount}`);

console.log("\nPer-property detail:");
for (const p of counts) {
  const rent = p.rentPerMonth != null ? `£${p.rentPerMonth}/mo` : "no rent set";
  console.log(`  ${(p.status ?? "?").padEnd(14)} ${rent.padEnd(12)} ${p.title}`);
}
