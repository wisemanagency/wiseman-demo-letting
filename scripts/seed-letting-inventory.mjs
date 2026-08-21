// One-off seeding: convert the existing 2 for-rent properties to full
// letting data and create 6 new letting properties so the demo has 8
// listings, 2 per area (Sampletown North/South/East/West).
//
// Idempotent via _id. Re-run-safe.
//
// Usage:  node scripts/seed-letting-inventory.mjs
//   --dry-run  print what would be done without writing.

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

const dryRun = process.argv.includes("--dry-run");

// ── Helpers ────────────────────────────────────────────────────────────────────

function pt(...paragraphs) {
  return paragraphs.map((text) => ({
    _type: "block",
    style: "normal",
    _key: Math.random().toString(36).slice(2, 14),
    children: [{ _type: "span", _key: Math.random().toString(36).slice(2, 14), text, marks: [] }],
    markDefs: [],
  }));
}

const today = new Date();
const isoDays = (deltaDays) => {
  const d = new Date(today);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
};

// Deposit = ~5 weeks rent (UK standard cap for letting)
function deposit(rentPcm) {
  return Math.round(((rentPcm * 12) / 52) * 5);
}

// ── Reference IDs (already in production) ─────────────────────────────────────
const AGENT_IDS = {
  alex: "agent-alex-demo",
  sam: "agent-sam-example",
  riley: "3d305be8-a85a-4ced-8ab7-5940615760e3",
  jordan: "da67c049-0510-4b4b-80d1-f7d705b90859",
};
const AREA_IDS = {
  north: "area-sampletown-north",
  south: "area-sampletown-south",
  west: "area-sampletown-west",
  east: "5bbb0bf7-0328-4093-99b8-b4e870ba0a33",
};
const BRANCH_REF = "scaffold-demo-branch-central";

// ── Per-property image refs (REPLACE these with the asset refs you actually
//    want each property to use). Leaving an entry absent means the property
//    will be created with images: [] and the front-end will fall back to the
//    floorplan placeholder.
//
//    We intentionally do NOT reuse another property's image here: a previous
//    version of this script picked a single image asset and assigned it to
//    every new property, which made 6 listings render the same photo. If a
//    property needs a real photo, upload one to Sanity and add its asset _ref
//    to this map. If you don't have a photo yet, leave the entry absent — the
//    floorplan placeholder is a far better failure mode than a misleading
//    duplicate.
//
//    Example (do NOT assume these IDs exist — fetch the real _ref from
//    Sanity Studio's Media tab after upload):
//      "1-bed-flat-harbour-view-sampletown-north": "image-abc123...-1920x1280-webp",
const IMAGE_REFS = {
  // Each _ref is from the project's existing licensed asset library
  // (house1-1 … house8-1). 6 distinct assets, no same-street collision with
  // the existing properties on Willow Drive or Riverside Quay.
  "1-bed-flat-harbour-view-sampletown-north":
    "image-079c29daa852f30103d8b1f1b35a39a67561d258-1920x1280-webp", // house6-4
  "3-bed-semi-oak-lane-sampletown-north":
    "image-ccdc76e6303c3ce4216dd8bcab157b9ad289ca4a-1920x1280-webp", // house4-2
  "2-bed-maisonette-riverside-quay-sampletown-west":
    "image-68a676509cf17e1e0c648a455784dabb3876f530-1920x1280-webp", // house2-1
  "4-bed-detached-willow-drive-sampletown-west":
    "image-e6ac9f05002a1c19e223a294468a15c9c76ad28a-1920x1280-webp", // house1-1
  "2-bed-cottage-mill-lane-sampletown-east":
    "image-0a44cab6cdbeb13586fb373965797a1a1a43fb9b-1920x1280-webp", // house3-3
  "3-bed-bungalow-heathfield-road-sampletown-east":
    "image-4778a5e6c63e6af3b4bc29c1afcdfd475b14efce-1920x1280-webp", // house7-7
};

// ── Patches: convert the 2 existing for-rent properties to full letting data ─
//
// Park View (UUID _id) and Demo Avenue (slug-derived _id) were seeded for the
// sales scaffold and never given rent. UK-market-consistent figures for the
// Sampletown South area: 2-bed flat ~£1,250 pcm, 2-bed terraced ~£1,350 pcm.
const PATCHES = [
  {
    _id: "prop-2-bed-flat-demo-avenue-sampletown-south",
    rentPerMonth: 1250,
    rentPeriod: "pcm",
    furnished: "furnished",
    minTermMonths: 6,
    availableFrom: isoDays(-12), // "Available now" (12 days ago)
    depositAmount: deposit(1250),
    label: "Demo Avenue (patch)",
  },
  {
    _id: "96e5e28a-d07d-4b2e-8373-98250072bc17",
    rentPerMonth: 1350,
    rentPeriod: "pcm",
    furnished: "unfurnished",
    minTermMonths: 12,
    availableFrom: isoDays(28), // 4 weeks out
    depositAmount: deposit(1350),
    label: "Park View (patch)",
  },
];

// ── New letting properties (6, two per area for North/West/East) ──────────────
function makeProperty({
  slug,
  title,
  type,
  town,
  areaRef,
  beds,
  baths,
  sqft,
  rent,
  furnished,
  minTerm,
  daysFromNow,
  agent,
  features,
  description,
}) {
  return {
    _type: "property",
    _id: `prop-${slug}`,
    title,
    slug: { _type: "slug", current: slug },
    status: "for-rent",
    propertyType: type,
    // Sale-price field is schema-required even on letting listings — store
    // the annual rent here so the Studio preview still renders *something*
    // sensible, but the live site uses rentPerMonth via formatRent().
    price: rent * 12,
    priceQualifier: "Fixed Price",
    rentPerMonth: rent,
    rentPeriod: "pcm",
    furnished,
    minTermMonths: minTerm,
    availableFrom: isoDays(daysFromNow),
    depositAmount: deposit(rent),
    bedrooms: beds,
    bathrooms: baths,
    receptionRooms: 1,
    sqft,
    epc: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
    councilTaxBand: ["B", "C", "D"][Math.floor(Math.random() * 3)],
    description: pt(...description),
    features,
    addressLine1: `${beds} ${title.split(",")[0]} Building`,
    town,
    county: "Sample County",
    postcode: `SE${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9) + 1} ${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9) + 1}AB`,
    location: {
      _type: "geopoint",
      lat: 51.5074 + (Math.random() - 0.5) * 0.02,
      lng: -0.1278 + (Math.random() - 0.5) * 0.02,
    },
    branch: { _type: "reference", _ref: BRANCH_REF },
    agent: { _type: "reference", _ref: agent },
    areaRef,
  };
}

const NEW_PROPERTIES = [
  // ── Sampletown North — 2 ────────────────────────────────────────────────────
  makeProperty({
    slug: "1-bed-flat-harbour-view-sampletown-north",
    title: "1 Bedroom Flat, Harbour View, Sampletown North",
    type: "Flat",
    town: "Sampletown North",
    areaRef: AREA_IDS.north,
    beds: 1,
    baths: 1,
    sqft: 480,
    rent: 1050,
    furnished: "furnished",
    minTerm: 6,
    daysFromNow: -7,
    agent: AGENT_IDS.riley,
    features: [
      "Open-plan kitchen",
      "Built-in storage",
      "Lift access",
      "Walking distance to station",
    ],
    description: [
      "A bright one-bedroom flat in a modern block, well placed for the riverside and the station.",
      "The accommodation includes an open-plan kitchen and reception room, a double bedroom with built-in storage, and a contemporary bathroom.",
    ],
  }),
  makeProperty({
    slug: "3-bed-semi-oak-lane-sampletown-north",
    title: "3 Bedroom Semi-Detached House, Oak Lane, Sampletown North",
    type: "Semi-Detached",
    town: "Sampletown North",
    areaRef: AREA_IDS.north,
    beds: 3,
    baths: 2,
    sqft: 1100,
    rent: 1750,
    furnished: "part-furnished",
    minTerm: 12,
    daysFromNow: 21,
    agent: AGENT_IDS.alex,
    features: [
      "South-facing garden",
      "Off-street parking",
      "Modern kitchen",
      "En-suite to principal bedroom",
    ],
    description: [
      "A well-presented three-bedroom semi-detached house on a quiet residential lane.",
      "Two reception rooms, a fitted kitchen, three bedrooms and a south-facing garden. Driveway parking for two cars.",
    ],
  }),

  // ── Sampletown West — 2 ─────────────────────────────────────────────────────
  makeProperty({
    slug: "2-bed-maisonette-riverside-quay-sampletown-west",
    title: "2 Bedroom Maisonette, Riverside Quay, Sampletown West",
    type: "Maisonette",
    town: "Sampletown West",
    areaRef: AREA_IDS.west,
    beds: 2,
    baths: 1,
    sqft: 780,
    rent: 1400,
    furnished: "furnished",
    minTerm: 6,
    daysFromNow: -3,
    agent: AGENT_IDS.jordan,
    features: ["Riverside views", "Private entrance", "Fitted kitchen", "Allocated parking"],
    description: [
      "A two-bedroom maisonette in a converted warehouse, with views over the quay.",
      "The property has its own front door, an open-plan reception room, a separate fitted kitchen, and two double bedrooms upstairs.",
    ],
  }),
  makeProperty({
    slug: "4-bed-detached-willow-drive-sampletown-west",
    title: "4 Bedroom Detached House, Willow Drive, Sampletown West",
    type: "Detached",
    town: "Sampletown West",
    areaRef: AREA_IDS.west,
    beds: 4,
    baths: 2,
    sqft: 1680,
    rent: 2650,
    furnished: "unfurnished",
    minTerm: 12,
    daysFromNow: 45,
    agent: AGENT_IDS.sam,
    features: ["Large rear garden", "Double garage", "Two reception rooms", "Utility room"],
    description: [
      "A spacious four-bedroom detached family home on a sought-after road.",
      "The ground floor offers two reception rooms, a kitchen-breakfast room, utility and downstairs WC. Four double bedrooms and a family bathroom upstairs.",
    ],
  }),

  // ── Sampletown East — 2 ─────────────────────────────────────────────────────
  makeProperty({
    slug: "2-bed-cottage-mill-lane-sampletown-east",
    title: "2 Bedroom Terraced Cottage, Mill Lane, Sampletown East",
    type: "Cottage",
    town: "Sampletown East",
    areaRef: AREA_IDS.east,
    beds: 2,
    baths: 1,
    sqft: 720,
    rent: 1150,
    furnished: "unfurnished",
    minTerm: 12,
    daysFromNow: 14,
    agent: AGENT_IDS.alex,
    features: ["Period features", "Exposed beams", "Wood-burning stove", "Rear courtyard"],
    description: [
      "A charming two-bedroom cottage on a quiet lane close to the village green.",
      "Period features throughout, including exposed beams and a wood-burning stove in the reception room. Compact fitted kitchen and bathroom.",
    ],
  }),
  makeProperty({
    slug: "3-bed-bungalow-heathfield-road-sampletown-east",
    title: "3 Bedroom Detached Bungalow, Heathfield Road, Sampletown East",
    type: "Bungalow",
    town: "Sampletown East",
    areaRef: AREA_IDS.east,
    beds: 3,
    baths: 2,
    sqft: 1250,
    rent: 1850,
    furnished: "part-furnished",
    minTerm: 6,
    daysFromNow: -21,
    agent: AGENT_IDS.riley,
    features: ["Wraparound garden", "Garage", "Conservatory", "Quiet cul-de-sac"],
    description: [
      "A detached bungalow on a quiet road on the eastern edge of town.",
      "Three bedrooms, two bathrooms, a conservatory overlooking the rear garden, and a single garage. Level walk to the village shop.",
    ],
  }),
];

// ── Apply ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱 Seeding letting inventory (token: ${source})${dryRun ? " [DRY RUN]" : ""}\n`);

  // Patches
  console.log("── Patches ──");
  for (const patch of PATCHES) {
    const existing = await client.fetch(
      `*[_id == $id][0]{_id, _rev}`,
      { id: patch._id },
      { cache: "no-store" }
    );
    if (!existing) {
      console.log(`  ⚠️  ${patch.label}: doc not found, skipping`);
      continue;
    }
    const fields = {
      rentPerMonth: patch.rentPerMonth,
      rentPeriod: patch.rentPeriod,
      furnished: patch.furnished,
      minTermMonths: patch.minTermMonths,
      availableFrom: patch.availableFrom,
      depositAmount: patch.depositAmount,
    };
    console.log(
      `  • ${patch.label}: rent=£${patch.rentPerMonth}/${patch.rentPeriod}, ${patch.furnished}, min ${patch.minTermMonths}mo, avail ${patch.availableFrom}, dep £${patch.depositAmount}`
    );
    if (dryRun) continue;
    let op = client.patch(patch._id).set(fields);
    if (existing._rev) op = op.ifRevisionId(existing._rev);
    await op.commit();
    console.log(`    ✓ patched`);
  }

  // New properties
  console.log("\n── New properties ──");

  // Pre-flight: every property must have its own entry in IMAGE_REFS, or
  // explicitly be opted in to the placeholder fallback. Anything missing is
  // treated as an operator mistake and refused loudly — the whole point of
  // this rewrite is that we never silently re-use another property's image.
  const missing = NEW_PROPERTIES.filter((p) => !IMAGE_REFS[p.slug.current]);
  if (missing.length > 0) {
    console.log(
      `  ⚠️  ${missing.length}/${NEW_PROPERTIES.length} properties have no entry in IMAGE_REFS:`
    );
    for (const p of missing) {
      console.log(`     - ${p.slug.current}  (${p.title})`);
    }
    console.log(`     These will render with the floorplan placeholder. Add asset refs to`);
    console.log(`     IMAGE_REFS in scripts/seed-letting-inventory.mjs and re-run, or leave`);
    console.log(`     them absent if the placeholder is acceptable for now.`);
  }

  for (const prop of NEW_PROPERTIES) {
    const imageRef = IMAGE_REFS[prop.slug.current];
    const images = imageRef
      ? [
          {
            _type: "image",
            _key: Math.random().toString(36).slice(2, 14),
            asset: { _type: "reference", _ref: imageRef },
          },
        ]
      : [];
    const doc = {
      ...prop,
      images,
    };
    delete doc.areaRef; // not part of the schema — just for our own reference
    const existing = await client.fetch(
      `*[_id == $id][0]._id`,
      { id: doc._id },
      { cache: "no-store" }
    );
    const action = existing ? "updated" : "created";
    const imageNote = imageRef ? `image: ${imageRef}` : "images: [] (placeholder fallback)";
    console.log(
      `  • ${doc.title} (£${doc.rentPerMonth}/pcm, ${doc.furnished}, ${doc.bedrooms} bed)`
    );
    console.log(`    ${imageNote}`);
    if (dryRun) continue;
    if (existing) {
      await client.createOrReplace(doc);
    } else {
      await client.create(doc);
    }
    console.log(`    ✓ ${action}`);
  }

  const withImageless = NEW_PROPERTIES.filter((p) => !IMAGE_REFS[p.slug.current]).length;
  console.log(
    `\n✅ Done. ${NEW_PROPERTIES.length - withImageless}/${NEW_PROPERTIES.length} properties had explicit image refs; ${withImageless} will use the floorplan placeholder.\n`
  );
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
