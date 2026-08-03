import { createClient } from "@sanity/client";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

// Generate a random 12-character alphanumeric key
function generateKey() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < 12; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// Build a portable text array from paragraphs, each block gets a _key
function pt(...paragraphs) {
  return paragraphs.map((text) => ({
    _type: "block",
    style: "normal",
    _key: generateKey(),
    children: [{ _type: "span", _key: generateKey(), text, marks: [] }],
    markDefs: [],
  }));
}

const agentsData = [
  {
    name: "Alex Demo",
    slug: "alex-demo",
    role: "Sales Negotiator",
    phone: "+44 20 0000 0002",
    email: "alex@example.com",
    order: 1,
    bio: pt("Demo agent profile used to exercise the scaffold's agent page template."),
  },
  {
    name: "Sam Example",
    slug: "sam-example",
    role: "Lettings Negotiator",
    phone: "+44 20 0000 0003",
    email: "sam@example.com",
    order: 2,
    bio: pt("Demo agent profile used to exercise the scaffold's agent page template."),
  },
];

async function upsertAgent(agent, branchRef) {
  const doc = {
    _type: "agent",
    _id: `agent-${agent.slug}`,
    name: agent.name,
    slug: { _type: "slug", current: agent.slug },
    role: agent.role,
    phone: agent.phone,
    email: agent.email,
    socialLinks: [],
    order: agent.order,
    active: true,
    bio: agent.bio,
    branch: { _type: "reference", _ref: branchRef },
  };

  const existing = await client.fetch(`*[_id == $id][0]._id`, { id: doc._id });
  if (existing) {
    await client.createOrReplace(doc);
    return "updated";
  } else {
    await client.create(doc);
    return "created";
  }
}

async function main() {
  console.log("\n🌱 Seeding agents...\n");

  // Find the demo branch
  const branch = await client.fetch(`*[_id == "scaffold-demo-branch-central"][0]{_id}`);
  if (!branch) {
    console.error(
      '❌ Demo branch "scaffold-demo-branch-central" not found. Run scripts/seed.js first.'
    );
    process.exit(1);
  }
  console.log(`  Found branch: ${branch._id}\n`);

  let fixed = 0;
  for (const agent of agentsData) {
    const result = await upsertAgent(agent, branch._id);
    console.log(`  ✅ ${agent.name} (${agent.role}) — ${result}`);
    fixed++;
  }

  console.log(`\n✅ Seeded ${fixed} agents.\n`);
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
