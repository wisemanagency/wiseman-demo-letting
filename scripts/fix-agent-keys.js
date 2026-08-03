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

// Fix portable text blocks — every block and span needs a _key
function fixBlocks(blocks) {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((block) => {
    const fixed = { ...block };
    if (!fixed._key) fixed._key = generateKey();
    if (fixed.children) {
      fixed.children = fixed.children.map((child) => {
        if (!child._key) return { ...child, _key: generateKey() };
        return child;
      });
    }
    return fixed;
  });
}

// Fix array of objects — every item needs a _key (arrays of primitives are fine)
function fixObjectArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((item) => {
    if (typeof item === "object" && item !== null && !item._key) {
      return { ...item, _key: generateKey() };
    }
    return item;
  });
}

// Check if an array of objects has any item missing _key
function arrayNeedsKeyFix(arr) {
  return (
    Array.isArray(arr) &&
    arr.some((item) => typeof item === "object" && item !== null && !item._key)
  );
}

// Check if any block in portable text is missing _key
function blocksNeedKeyFix(arr) {
  if (!Array.isArray(arr)) return false;
  return arr.some((block) => {
    if (!block._key) return true;
    if (Array.isArray(block.children)) {
      return block.children.some((child) => !child._key);
    }
    return false;
  });
}

async function main() {
  console.log("\n🔧 Fixing agent _keys...\n");

  const docs = await client.fetch(
    `*[_type == "agent"]{_id, name, socialLinks, specialisms, bio}`,
    {},
    { cache: "no-store" }
  );

  console.log(`Found ${docs.length} agent documents.\n`);

  let fixed = 0;

  for (const doc of docs) {
    let needsPatch = false;
    const patch = {};

    if (doc.socialLinks && arrayNeedsKeyFix(doc.socialLinks)) {
      patch.socialLinks = fixObjectArray(doc.socialLinks);
      needsPatch = true;
    }

    if (doc.bio && blocksNeedKeyFix(doc.bio)) {
      patch.bio = fixBlocks(doc.bio);
      needsPatch = true;
    }

    // specialisms are strings — no _key needed for primitives, skip
    // but check specialisms anyway to confirm it's not object array
    if (doc.specialisms && arrayNeedsKeyFix(doc.specialisms)) {
      patch.specialisms = fixObjectArray(doc.specialisms);
      needsPatch = true;
    }

    if (!needsPatch) continue;

    try {
      await client.patch(doc._id, { set: patch }).commit();
      console.log(`  ✅ ${doc.name}`);
      fixed++;
    } catch (err) {
      console.error(`  ❌ ${doc.name}: ${err.message}`);
    }
  }

  console.log(`\n✅ Fixed ${fixed} agent documents.\n`);
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err.message);
  process.exit(1);
});
