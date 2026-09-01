// One-shot setup: ensure the Sanity → Vercel deploy hook is wired up.
//
// The webhook tells Sanity to POST to a Vercel deploy-hook URL whenever a
// content document is created, updated, or deleted in the production
// dataset. That triggers a Vercel build, which in turn rebuilds the static
// site with the fresh Sanity content.
//
// Why this exists: the site is a fully static build. It reads Sanity at
// BUILD time, not request time. Without this hook, Studio publishes don't
// reach Vercel — content drifts and the live site goes stale.
//
// Usage:
//   node scripts/setup-sanity-vercel-webhook.mjs                  # dry-run, shows current state
//   VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/.../... \
//     node scripts/setup-sanity-vercel-webhook.mjs --apply        # creates/updates the webhook
//
// The hook URL must come from Vercel (Project Settings → Git → Deploy
// Hooks → Create). The Sanity CLI token is used for the Management API
// call.

import https from "node:https";
import fs from "fs";
import os from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = "4k3lxsgw";
const DATASET = "production";
const HOOK_NAME = "Vercel deploy hook (letting)";

// Document types whose changes should trigger a Vercel rebuild. Mirrors the
// site schema: any change to a content doc should rebuild the static
// site. Testimonials/areas/branches are also surfaced in the UI, so they
// count as content.
const TYPES_TO_TRIGGER = [
  "post",
  "property",
  "agent",
  "area",
  "page",
  "siteSettings",
  "branch",
  "testimonial",
];

function resolveToken() {
  if (process.env.SANITY_TOKEN) return process.env.SANITY_TOKEN;
  if (process.env.SANITY_MIGRATION_TOKEN) return process.env.SANITY_MIGRATION_TOKEN;
  const cliConfig = join(os.homedir(), ".config", "sanity", "config.json");
  if (fs.existsSync(cliConfig)) {
    const cfg = JSON.parse(fs.readFileSync(cliConfig, "utf8"));
    if (cfg.authToken) return cfg.authToken;
  }
  throw new Error("No Sanity token available (set SANITY_TOKEN or run `npx sanity login`).");
}

const TOKEN = resolveToken();
const NEW_URL = process.env.VERCEL_DEPLOY_HOOK_URL;
const APPLY = process.argv.includes("--apply");

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: "api.sanity.io",
        path: `/v2021-10-04${path}`,
        method,
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (d) => (chunks += d));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch {
            resolve({ status: res.statusCode, body: chunks });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const body = {
  name: HOOK_NAME,
  description:
    "Triggered on any content change in the production dataset. Posts to the Vercel deploy hook so the static site rebuilds with fresh Sanity content.",
  url: NEW_URL,
  dataset: DATASET,
  filter: null,
  projection: null,
  httpMethod: "POST",
  includeDrafts: false,
  includeAllVersions: false,
  apiVersion: "v2021-03-25",
  headers: {},
  rule: {
    on: ["create", "update", "delete"],
    filter: `_type in [${TYPES_TO_TRIGGER.map((t) => JSON.stringify(t)).join(", ")}]`,
    projection: "{_type, _id}",
  },
};

async function main() {
  console.log(`\n🔗 Sanity → Vercel deploy-hook setup\n`);
  console.log(`   project: ${PROJECT_ID}`);
  console.log(`   dataset: ${DATASET}`);
  console.log(`   target URL: ${NEW_URL || "(not set — pass VERCEL_DEPLOY_HOOK_URL)"}`);
  console.log(`   types that trigger: ${TYPES_TO_TRIGGER.join(", ")}`);
  console.log(`   mode: ${APPLY ? "APPLY (will write)" : "DRY RUN (pass --apply to write)"}\n`);

  // List existing webhooks
  const list = await apiCall("GET", `/hooks/projects/${PROJECT_ID}`);
  if (list.status !== 200) {
    console.log(`❌ Failed to list webhooks: ${JSON.stringify(list)}`);
    process.exit(1);
  }
  const existing = (list.body || []).find((h) => h.name === HOOK_NAME);

  if (existing) {
    console.log(`── Found existing webhook ──`);
    console.log(`   id:       ${existing.id}`);
    console.log(`   url:      ${existing.url}`);
    console.log(`   dataset:  ${existing.dataset}`);
    console.log(`   isDisabled: ${existing.isDisabled}`);
    console.log(`   createdAt:  ${existing.createdAt}\n`);

    const urlMatches = existing.url === NEW_URL;
    const typesMatch = JSON.stringify(existing.rule?.filter) === body.rule.filter;

    if (urlMatches && typesMatch) {
      console.log("✅ Webhook already correct — no changes needed.");
      return;
    }

    if (!APPLY) {
      console.log(
        urlMatches
          ? "   ↪ URL is current; types have drifted — re-run with --apply to update."
          : "   ↪ URL has drifted from your local env — re-run with --apply to update."
      );
      return;
    }

    // PATCH
    const patch = await apiCall("PATCH", `/hooks/projects/${PROJECT_ID}/${existing.id}`, {
      url: NEW_URL,
      rule: body.rule,
    });
    if (patch.status !== 200) {
      console.log(`❌ PATCH failed: ${JSON.stringify(patch)}`);
      process.exit(1);
    }
    console.log("✅ Webhook updated.");
    console.log(`   new url: ${patch.body.url}`);
    return;
  }

  // No existing webhook — create one
  if (!APPLY) {
    console.log("── No existing webhook found ──");
    console.log("   Re-run with --apply (and VERCEL_DEPLOY_HOOK_URL set) to create one.");
    return;
  }

  const create = await apiCall("POST", `/hooks/projects/${PROJECT_ID}`, body);
  if (create.status !== 200 && create.status !== 201) {
    console.log(`❌ Create failed: ${JSON.stringify(create)}`);
    process.exit(1);
  }
  console.log(`✅ Webhook created.`);
  console.log(`   id:  ${create.body.id}`);
  console.log(`   url: ${create.body.url}`);
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err.message);
  process.exit(1);
});
