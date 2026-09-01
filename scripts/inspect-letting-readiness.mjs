// One-off read-only inspection: dump the 2 existing for-rent properties
// plus look at all properties' image situation, so the seeding script can
// decide which fields to patch vs leave alone.
//
// Usage: node scripts/inspect-letting-readiness.mjs

import { createClient } from "@sanity/client";
import fs from "fs";
import os from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import dotenv from "dotenv";

dotenv.config({ path: join(__dirname, "..", ".env") });

function resolveToken() {
  if (process.env.SANITY_TOKEN) return process.env.SANITY_TOKEN;
  if (process.env.SANITY_MIGRATION_TOKEN) return process.env.SANITY_MIGRATION_TOKEN;
  const cliConfig = join(os.homedir(), ".config", "sanity", "config.json");
  if (fs.existsSync(cliConfig)) {
    const cfg = JSON.parse(fs.readFileSync(cliConfig, "utf8"));
    if (cfg.authToken) return cfg.authToken;
  }
  throw new Error("No Sanity token available.");
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "4k3lxsgw",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token: resolveToken(),
  useCdn: false,
});

const docs = await client.fetch(
  `*[_type == "property"] | order(_createdAt asc){
    _id, title, status, town,
    rentPerMonth, rentPeriod, furnished, minTermMonths, availableFrom, depositAmount,
    "imageCount": length(images),
    "branchRef": branch._ref,
    "agentRef": agent._ref
  }`,
  {},
  { cache: "no-store" }
);

console.log("\nAll properties (letting readiness):\n");
for (const p of docs) {
  const flags = [];
  if (p.status === "for-rent" || p.status === "let-agreed" || p.status === "let") {
    if (p.rentPerMonth == null) flags.push("❌ no rent");
    else flags.push(`✓ £${p.rentPerMonth}/${p.rentPeriod ?? "pcm"}`);
    if (!p.furnished) flags.push("no furnished");
    if (p.minTermMonths == null) flags.push("no minTerm");
    if (!p.availableFrom) flags.push("no availableFrom");
    if (p.depositAmount == null) flags.push("no deposit");
  }
  console.log(
    `  ${p._id.padEnd(45)} ${(p.status ?? "?").padEnd(11)} ${(p.town ?? "?").padEnd(20)} imgs=${p.imageCount} ${flags.join(" ")}`
  );
}

// Agents
const agents = await client.fetch(
  `*[_type == "agent" && active != false]{_id, name} | order(order asc)`
);
console.log("\nActive agents:");
for (const a of agents) console.log(`  ${a._id.padEnd(30)} ${a.name}`);

// Areas
const areas = await client.fetch(`*[_type == "area"]{_id, name}`);
console.log("\nAreas:");
for (const a of areas) console.log(`  ${a._id.padEnd(30)} ${a.name}`);

// Branch
const branch = await client.fetch(`*[_type == "branch"][0]{_id, name}`);
console.log(`\nBranch: ${branch?._id} — ${branch?.name}\n`);
