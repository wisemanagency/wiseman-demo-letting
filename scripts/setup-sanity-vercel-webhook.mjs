// One-shot setup: ensure the Sanity → debounced-Vercel-deploy-hook is wired up.
//
// The Sanity webhook points at this site's /api/sanity-webhook endpoint, which
// debounces bursts of publish events and forwards to the Vercel deploy hook
// only after the burst settles. Without this debouncer, a client uploading
// several images in quick succession triggers overlapping Vercel deploys that
// can capture intermediate state (e.g. only 1 of 6 images), leaving the live
// site stale until the next edit.
//
// Why this script is templated (env-driven):
//   - The Sanity project ID and the Vercel domain differ per client.
//   - The deploy-hook URL is created in Vercel per project.
//   - Re-running for a new client just means changing the env vars.
//
// Usage:
//   # Dry run — shows what would change:
//   SANITY_PROJECT_ID=abc12345 \
//   VERCEL_PROJECT_DOMAIN=client-site.vercel.app \
//   VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy \
//     node scripts/setup-sanity-vercel-webhook.mjs
//
//   # Apply — creates or PATCHes the hook:
//   ...same env... \
//     node scripts/setup-sanity-vercel-webhook.mjs --apply
//
// Optional overrides:
//   SANITY_HOOK_NAME — custom name (default: "Vercel deploy hook (debounced)")
//   WEBHOOK_TARGET_URL — bypass the debouncer and point Sanity directly at
//                        a URL of your choice (e.g. the bare Vercel deploy
//                        hook). Useful only if you've removed the /api
//                        endpoint from this project.

import https from "node:https";
import fs from "fs";
import os from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = process.env.SANITY_PROJECT_ID || "4k3lxsgw";
const DATASET = "production";
const HOOK_NAME = process.env.SANITY_HOOK_NAME || "Vercel deploy hook (debounced)";

// Document types whose changes should trigger a Vercel rebuild. Mirrors
// the site schema: any change to a content doc should rebuild the static
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
const APPLY = process.argv.includes("--apply");

// Resolve the webhook target URL: either explicit override, or the
// debouncer endpoint on this project's Vercel deployment.
function resolveTargetUrl() {
  if (process.env.WEBHOOK_TARGET_URL) return process.env.WEBHOOK_TARGET_URL;
  const domain = process.env.VERCEL_PROJECT_DOMAIN;
  if (!domain) {
    throw new Error(
      "VERCEL_PROJECT_DOMAIN is required (e.g. 'wiseman-demo-letting.vercel.app'). " +
        "Override with WEBHOOK_TARGET_URL to bypass the debouncer."
    );
  }
  return `https://${domain}/api/sanity-webhook`;
}

const NEW_URL = resolveTargetUrl();
const DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;
if (!DEPLOY_HOOK_URL) {
  throw new Error(
    "VERCEL_DEPLOY_HOOK_URL is required (Project Settings → Git → Deploy Hooks → Create)."
  );
}

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
    "Triggered on any content change in the production dataset. Posts to this site's /api/sanity-webhook debouncer, which forwards to the Vercel deploy hook after the burst settles (avoids overlapping deploys capturing intermediate state during multi-image uploads).",
  url: NEW_URL,
  dataset: DATASET,
  // POST doesn't accept the newer `rule` object — it needs the legacy
  // `filter`/`projection` GROQ strings. We derive them from TYPES_TO_TRIGGER
  // and use them for both POST (legacy) and PATCH (newer rule format).
  filter: `_type in [${TYPES_TO_TRIGGER.map((t) => JSON.stringify(t)).join(", ")}]`,
  projection: "{_type, _id}",
  httpMethod: "POST",
  includeDrafts: false,
  includeAllVersions: false,
  apiVersion: "v2021-03-25",
  headers: {},
};

// PATCH-only: the newer format that combines on/filter/projection.
const rule = {
  on: ["create", "update", "delete"],
  filter: body.filter,
  projection: body.projection,
};

async function main() {
  console.log(`\n🔗 Sanity → debounced Vercel deploy-hook setup\n`);
  console.log(`   project:           ${PROJECT_ID}`);
  console.log(`   dataset:           ${DATASET}`);
  console.log(`   hook name:         ${HOOK_NAME}`);
  console.log(`   webhook target:    ${NEW_URL}`);
  console.log(`   deploy hook URL:   ${DEPLOY_HOOK_URL}`);
  console.log(`   types that trigger: ${TYPES_TO_TRIGGER.join(", ")}`);
  console.log(
    `   mode:              ${APPLY ? "APPLY (will write)" : "DRY RUN (pass --apply to write)"}\n`
  );

  // List existing webhooks
  const list = await apiCall("GET", `/hooks/projects/${PROJECT_ID}`);
  if (list.status !== 200) {
    console.log(`❌ Failed to list webhooks: ${JSON.stringify(list)}`);
    process.exit(1);
  }

  // Match by name first; fall back to any webhook whose URL still points at
  // the OLD Vercel deploy-hook pattern (legacy webhooks from before the
  // debouncer existed).
  const hooks = list.body || [];
  const existing =
    hooks.find((h) => h.name === HOOK_NAME) ||
    hooks.find((h) => h.url?.includes("api.vercel.com/v1/integrations/deploy/"));

  if (existing) {
    console.log(`── Found existing webhook ──`);
    console.log(`   id:        ${existing.id}`);
    console.log(`   name:      ${existing.name}`);
    console.log(`   url:       ${existing.url}`);
    console.log(`   dataset:   ${existing.dataset}`);
    console.log(`   isDisabled: ${existing.isDisabled}`);
    console.log(`   createdAt:  ${existing.createdAt}\n`);

    const urlMatches = existing.url === NEW_URL;
    const nameMatches = existing.name === HOOK_NAME;
    const typesMatch = JSON.stringify(existing.rule?.filter) === rule.filter;

    if (urlMatches && nameMatches && typesMatch) {
      console.log("✅ Webhook already correct — no changes needed.");
      return;
    }

    if (!APPLY) {
      console.log(
        `   ↪ ${!urlMatches ? "URL has drifted" : !typesMatch ? "types have drifted" : "name has drifted"} — re-run with --apply to update.`
      );
      return;
    }

    // PATCH — the only supported mutation on an existing webhook.
    const patch = await apiCall("PATCH", `/hooks/projects/${PROJECT_ID}/${existing.id}`, {
      name: HOOK_NAME,
      url: NEW_URL,
      rule,
    });
    if (patch.status !== 200) {
      console.log(`❌ PATCH failed: ${JSON.stringify(patch)}`);
      process.exit(1);
    }
    console.log("✅ Webhook updated.");
    console.log(`   new name: ${patch.body.name}`);
    console.log(`   new url:  ${patch.body.url}`);
    return;
  }

  // No existing webhook at all — POST without `rule`/`filter`/`projection`
  // (the POST endpoint is strict about which fields it accepts; the schema
  // varies by API version). The webhook will trigger on every dataset
  // change; PATCH it next run to add the type filter.
  if (!APPLY) {
    console.log("── No existing webhook found ──");
    console.log("   Re-run with --apply to create one.");
    return;
  }

  const create = await apiCall("POST", `/hooks/projects/${PROJECT_ID}`, {
    name: HOOK_NAME,
    description: body.description,
    url: NEW_URL,
    dataset: DATASET,
    httpMethod: "POST",
    includeDrafts: false,
    includeAllVersions: false,
    apiVersion: "v2021-03-25",
    headers: {},
  });
  if (create.status !== 200 && create.status !== 201) {
    console.log(`❌ Create failed: ${JSON.stringify(create)}`);
    process.exit(1);
  }
  console.log(`✅ Webhook created.`);
  console.log(`   id:  ${create.body.id}`);
  console.log(`   url: ${create.body.url}`);
  console.log(
    `\n   ⚠️  Created without a type filter (POST API limit). Re-run --apply now to add the filter.`
  );

  // Immediately PATCH to add the rule.
  const patch = await apiCall("PATCH", `/hooks/projects/${PROJECT_ID}/${create.body.id}`, { rule });
  if (patch.status !== 200) {
    console.log(`   ⚠️  Could not add type filter automatically: ${JSON.stringify(patch)}`);
    return;
  }
  console.log(`   ✅ Type filter added.`);
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err.message);
  process.exit(1);
});
