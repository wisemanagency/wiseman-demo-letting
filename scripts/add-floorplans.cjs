/**
 * One-time script: adds a placeholder floorplan SVG to all properties.
 * Run: node scripts/add-floorplans.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@sanity/client");

const token = process.env.SANITY_TOKEN;
if (!token) {
  throw new Error(
    "SANITY_TOKEN environment variable is required. Set it in .env or your shell environment."
  );
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "itpavex8",
  dataset: "production",
  token,
  apiVersion: "2024-01-01",
  useCdn: false,
});

async function main() {
  console.log("Fetching properties without floorplans...");

  const properties = await client.fetch(
    '*[_type == "property" && (!defined(floorplan) || floorplan == null)] { _id, title }'
  );

  if (!properties.length) {
    console.log("No properties need floorplans.");
    return;
  }

  console.log(
    "Found " + properties.length + " properties: " + properties.map((p) => p.title).join(", ")
  );

  const svgPath = path.join(__dirname, "../public/floorplan-placeholder.svg");
  const svgBuffer = fs.readFileSync(svgPath);

  console.log("Uploading floorplan SVG to Sanity assets...");
  const asset = await client.assets.upload("image", svgBuffer, {
    filename: "floorplan-placeholder.svg",
    contentType: "image/svg+xml",
  });
  console.log("Uploaded! Asset ID: " + asset._id);

  for (const property of properties) {
    console.log("Patching " + property.title + "...");
    await client
      .patch(property._id)
      .set({
        floorplan: {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
        },
      })
      .commit();
    console.log("  OK");
  }

  console.log("All done!");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
