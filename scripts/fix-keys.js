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

// Ensure every block in a portable text array has a _key
function fixBlocks(blocks) {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((block) => {
    if (!block._key) {
      return { ...block, _key: generateKey() };
    }
    return block;
  });
}

// Check if any block in an array is missing _key
function needsFix(blocks) {
  if (!Array.isArray(blocks)) return false;
  return blocks.some((block) => !block._key);
}

async function main() {
  console.log("\n🔧 Starting _key fix...\n");

  // Fetch all properties and areas with their description fields
  const docs = await client.fetch(
    `*[_type in ["property", "area"] && defined(description)]{_id, _type, title, name, description}`,
    {},
    { cache: "no-store" }
  );

  console.log(`Found ${docs.length} documents with description fields to check.\n`);

  let fixed = 0;
  let alreadyOk = 0;

  for (const doc of docs) {
    if (!needsFix(doc.description)) {
      alreadyOk++;
      continue;
    }

    const fixedBlocks = fixBlocks(doc.description);

    try {
      // Use patch with set to only update the description field, leaving others intact
      await client.patch(doc._id, { set: { description: fixedBlocks } }).commit();
      const label = doc.title || doc.name || doc._id;
      console.log(`  ✅ Fixed ${doc._type}: ${label}`);
      fixed++;
    } catch (err) {
      console.error(`  ❌ Failed to patch ${doc._id}: ${err.message}`);
    }
  }

  console.log(`\n📊 Results: ${fixed} fixed, ${alreadyOk} already had keys.\n`);
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err.message);
  process.exit(1);
});
