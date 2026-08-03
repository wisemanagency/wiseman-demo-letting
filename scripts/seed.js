import { createClient } from "@sanity/client";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

// Small delay between operations to avoid API rate-limit conflicts
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Portable text block helper ───────────────────────────────────────────────
function pt(text) {
  return [
    {
      _type: "block",
      style: "normal",
      children: [{ _type: "span", text, marks: [] }],
      markDefs: [],
    },
  ];
}

// ─── Idempotent upsert (replace if exists, create if not) ─────────────────────
async function upsert(doc) {
  if (!doc._id)
    throw new Error(`upsert() requires _id on all documents: ${JSON.stringify(doc).slice(0, 80)}`);
  const existing = await client.fetch(`*[_id == $id][0]._id`, { id: doc._id }).catch(() => null);
  if (existing) {
    await client.createOrReplace(doc);
    return "updated";
  } else {
    await client.create(doc);
    return "created";
  }
}

// ─── DATA ───────────────────────────────────────────────────────────────────────

const siteSettingsData = {
  _type: "siteSettings",
  _id: "site-settings",
  siteName: "Real Estate Scaffold Demo",
  siteTagline: "A white-label property platform",
  primaryColour: "#1a3a5c",
  secondaryColour: "#c9a84c",
  phone: "+44 20 0000 0000",
  email: "hello@example.com",
  footerText: "© 2026 Real Estate Scaffold Demo",
  defaultMetaTitle: "Real Estate Scaffold Demo",
  defaultMetaDescription: "Property listings demo for the real-estate scaffold template",
  socialLinks: [],
};

const branchData = {
  _type: "branch",
  _id: "scaffold-demo-branch-central",
  name: "Central Demo Branch",
  slug: { _type: "slug", current: "central-demo-branch" },
  address: "1 Demo Street, Sample Town, SW1A 1AA",
  phone: "+44 20 0000 0001",
  email: "central@example.com",
  openingHours: "Mon–Fri 9:00–18:00",
};

const areasData = [
  {
    _type: "area",
    _id: "area-sampletown-north",
    name: "Sampletown North",
    slug: { _type: "slug", current: "sampletown-north" },
    description: pt("A demo area used to exercise the scaffold's area page template."),
    metaTitle: "Property in Sampletown North",
    metaDescription: "Find demo property listings in Sampletown North",
  },
  {
    _type: "area",
    _id: "area-sampletown-south",
    name: "Sampletown South",
    slug: { _type: "slug", current: "sampletown-south" },
    description: pt("A demo area used to exercise the scaffold's area page template."),
    metaTitle: "Property in Sampletown South",
    metaDescription: "Find demo property listings in Sampletown South",
  },
  {
    _type: "area",
    _id: "area-sampletown-west",
    name: "Sampletown West",
    slug: { _type: "slug", current: "sampletown-west" },
    description: pt("A demo area used to exercise the scaffold's area page template."),
    metaTitle: "Property in Sampletown West",
    metaDescription: "Find demo property listings in Sampletown West",
  },
];

const propertiesData = [
  {
    title: "3 Bedroom Detached House, Sample Road, Sampletown North",
    slug: { _type: "slug", current: "3-bed-detached-sample-road-sampletown-north" },
    status: "for-sale",
    propertyType: "Detached",
    price: 450000,
    priceQualifier: "Guide Price",
    bedrooms: 3,
    bathrooms: 2,
    receptionRooms: 1,
    sqft: 1450,
    tenure: "Freehold",
    epc: "C",
    councilTaxBand: "D",
    description: pt(
      "A three-bedroom detached family home used to exercise the scaffold's property detail template.",
      "The property offers flexible accommodation across two floors, including an open-plan kitchen and reception area, a principal bedroom with en-suite, and a private rear garden.",
      "The home is presented in good decorative order throughout and is offered with no onward chain."
    ),
    features: [
      "Modern kitchen",
      "Off-street parking",
      "Private rear garden",
      "En-suite to principal bedroom",
      "Close to local amenities",
    ],
    addressLine1: "1 Sample Road",
    town: "Sampletown North",
    county: "Sample County",
    postcode: "SW1A 1AA",
    location: { _type: "geopoint", lat: 51.5074, lng: -0.1278 },
  },
  {
    title: "2 Bedroom Flat, Demo Avenue, Sampletown South",
    slug: { _type: "slug", current: "2-bed-flat-demo-avenue-sampletown-south" },
    status: "for-rent",
    propertyType: "Flat",
    price: 1800,
    priceQualifier: "Fixed Price",
    bedrooms: 2,
    bathrooms: 1,
    receptionRooms: 1,
    sqft: 720,
    tenure: "Leasehold",
    epc: "B",
    councilTaxBand: "C",
    description: pt(
      "A two-bedroom flat used to exercise the scaffold's rental listing template.",
      "The accommodation includes a bright reception room, a separate fitted kitchen, two double bedrooms, and a modern bathroom."
    ),
    features: [
      "Separate fitted kitchen",
      "Two double bedrooms",
      "Modern bathroom",
      "Communal garden access",
    ],
    addressLine1: "2 Demo Avenue",
    town: "Sampletown South",
    county: "Sample County",
    postcode: "SW2B 2BB",
    location: { _type: "geopoint", lat: 51.5074, lng: -0.1278 },
  },
  {
    title: "4 Bedroom Semi-Detached House, Example Lane, Sampletown West",
    slug: { _type: "slug", current: "4-bed-semi-example-lane-sampletown-west" },
    status: "sold",
    propertyType: "Semi-Detached",
    price: 625000,
    priceQualifier: "Guide Price",
    bedrooms: 4,
    bathrooms: 2,
    receptionRooms: 2,
    sqft: 1800,
    tenure: "Freehold",
    epc: "D",
    councilTaxBand: "E",
    description: pt(
      "A four-bedroom semi-detached house used to exercise the scaffold's sold-status display.",
      'The property features two reception rooms, a kitchen-diner, four bedrooms, and a rear garden. Marketed as a "sold" listing so the scaffold can render the appropriate status badge and availability.'
    ),
    features: [
      "Two reception rooms",
      "Kitchen-diner",
      "Four bedrooms",
      "Rear garden",
      "Garage",
      "Quiet residential road",
    ],
    addressLine1: "3 Example Lane",
    town: "Sampletown West",
    county: "Sample County",
    postcode: "SW3C 3CC",
    location: { _type: "geopoint", lat: 51.5074, lng: -0.1278 },
  },
];

// ─── SEED ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("\n🌱 Starting Sanity seed...\n");

  // 1. Site Settings (singleton — idempotent via _id)
  console.log("📄 Site Settings...");
  const ssResult = await upsert(siteSettingsData);
  console.log(`  ✓ Site Settings ${ssResult}`);

  // 2. Branch (idempotent via _id)
  console.log("\n📄 Branch...");
  const brResult = await upsert(branchData);
  console.log(`  ✓ Branch ${brResult}`);

  // 3. Areas (idempotent via _id)
  console.log("\n📄 Areas...");
  for (const area of areasData) {
    const arResult = await upsert(area);
    console.log(`  ✓ Area:${area.name} ${arResult}`);
  }

  // Brief delay so references resolve before properties reference the branch
  await delay(1500);

  // 4. Properties (idempotent via _id, reference branch by _id)
  console.log("\n📄 Properties...");
  for (const prop of propertiesData) {
    const propId = `prop-${prop.slug.current}`;
    const doc = {
      ...prop,
      _type: "property",
      _id: propId,
      branch: { _type: "reference", _ref: "scaffold-demo-branch-central" },
    };
    const prResult = await upsert(doc);
    console.log(`  ✓ property:${prop.slug.current} ${prResult}`);
    // Brief delay between each property to avoid rate-limit geopoint conflicts
    await delay(1500);
  }

  console.log("\n✅ Seed complete!\n");
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
