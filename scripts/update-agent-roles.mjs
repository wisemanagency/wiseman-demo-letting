// One-off patch: rebrand Riley Morgan & Alex Demo's role titles from
// "Senior Sales Negotiator" / "Sales Negotiator" to letting-first
// equivalents so the titles match the already-rewritten landlord/tenant
// bios. Other agents are left untouched.
//
// Usage:  node scripts/update-agent-roles.mjs
//   --dry-run  print changes without writing.

import { createClient } from "@sanity/client";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const dryRun = process.argv.includes("--dry-run");

// Token resolution order:
//   1. SANITY_TOKEN env var (preferred — explicit write-capable token)
//   2. SANITY_MIGRATION_TOKEN (matches fix-portabletext-marks.mjs convention)
//   3. Sanity CLI auth in ~/.config/sanity/config.json (broad Studio auth;
//      only used if neither of the above is set, and only for this one-off
//      patch — never commit the resolved value, never log it)
function resolveToken() {
  if (process.env.SANITY_TOKEN) return { token: process.env.SANITY_TOKEN, source: "SANITY_TOKEN" };
  if (process.env.SANITY_MIGRATION_TOKEN)
    return { token: process.env.SANITY_MIGRATION_TOKEN, source: "SANITY_MIGRATION_TOKEN" };
  const cliConfig = join(os.homedir(), ".config", "sanity", "config.json");
  if (fs.existsSync(cliConfig)) {
    const cfg = JSON.parse(fs.readFileSync(cliConfig, "utf8"));
    if (cfg.authToken) return { token: cfg.authToken, source: "sanity-cli-config" };
  }
  throw new Error(
    "No Sanity write token available. Set SANITY_TOKEN or SANITY_MIGRATION_TOKEN, " +
      "or sign in with `npx sanity login` so ~/.config/sanity/config.json has authToken."
  );
}

const { token, source } = resolveToken();

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "4k3lxsgw",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token,
  useCdn: false,
});

console.log(`\n🔧 Patching agent roles (token source: ${source})${dryRun ? " [DRY RUN]" : ""}\n`);

const ROLE_PATCHES = [
  { name: "Riley Morgan", newRole: "Senior Lettings Negotiator" },
  { name: "Alex Demo", newRole: "Lettings Negotiator" },
];

async function main() {
  const agents = await client.fetch(
    `*[_type == "agent" && active != false]{_id, _rev, name, role}`,
    {},
    { cache: "no-store" }
  );

  let patched = 0;
  let skipped = 0;

  for (const patch of ROLE_PATCHES) {
    const agent = agents.find((a) => a.name === patch.name);
    if (!agent) {
      console.log(`  ⚠️  ${patch.name}: not found in dataset`);
      skipped++;
      continue;
    }
    if (agent.role === patch.newRole) {
      console.log(`  ⏭️  ${agent.name}: already "${agent.role}", no change`);
      skipped++;
      continue;
    }
    const before = agent.role;
    console.log(`  • ${agent.name}: "${before}" → "${patch.newRole}"`);
    if (dryRun) continue;

    let op = client.patch(agent._id).set({ role: patch.newRole });
    if (agent._rev) op = op.ifRevisionId(agent._rev);
    try {
      await op.commit();
      console.log(`    ✓ patched`);
      patched++;
    } catch (err) {
      console.error(`    ❌ ${err.message}`);
    }
  }

  console.log(`\n${dryRun ? "Would patch" : "Patched"} ${patched} agent(s); ${skipped} skipped.\n`);
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err.message);
  process.exit(1);
});
