import { useMemo, useState } from "react";

interface Property {
  _id: string;
  slug: string;
  title: string;
  status: string;
  propertyType?: string;
  price: number;
  priceQualifier?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  town?: string;
  postcode?: string;
  thumbnail?: {
    asset: { url: string; metadata?: { lqip?: string } };
    alt?: string;
  };
}

interface Props {
  properties: Property[];
  towns: string[];
  propertyTypes: string[];
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "for-sale", label: "For Sale" },
  { value: "for-rent", label: "To Let" },
  { value: "under-offer", label: "Under Offer" },
  { value: "sold-stc", label: "Sold STC" },
];

const bedroomOptions = [
  { value: "", label: "Any Beds" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

const priceRanges = [
  { value: "", label: "Any Price" },
  { value: "0-250000", label: "Up to £250k" },
  { value: "250000-500000", label: "£250k – £500k" },
  { value: "500000-750000", label: "£500k – £750k" },
  { value: "750000-1000000", label: "£750k – £1m" },
  { value: "1000000-999999999", label: "£1m+" },
];

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "price-asc", label: "Price (Low–High)" },
  { value: "price-desc", label: "Price (High–Low)" },
  { value: "beds-desc", label: "Most Bedrooms" },
];

function formatPrice(price: number, qualifier?: string): string {
  if (!price && qualifier === "POA") return "POA";
  const formatted = `£${price.toLocaleString("en-GB")}`;
  return qualifier && qualifier !== "POA" ? `${qualifier} ${formatted}` : formatted;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    "for-sale": "For Sale",
    "under-offer": "Under Offer",
    "sold-stc": "Sold STC",
    sold: "Sold",
    "for-rent": "To Let",
    "let-agreed": "Let Agreed",
    let: "Let",
  };
  return map[status] || status;
}

function statusColour(status: string): string {
  if (status === "for-sale" || status === "for-rent") return "bg-green-600";
  if (status === "under-offer" || status === "let-agreed") return "bg-amber-500";
  return "bg-red-600";
}

export default function PropertyFilter({ properties, towns, propertyTypes }: Props) {
  const [status, setStatus] = useState("");
  const [town, setTown] = useState("");
  const [type, setType] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = [...properties];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.town?.toLowerCase().includes(q) ||
          p.postcode?.toLowerCase().includes(q)
      );
    }

    // Filters
    if (status) result = result.filter((p) => p.status === status);
    if (town) result = result.filter((p) => p.town === town);
    if (type) result = result.filter((p) => p.propertyType === type);
    if (minBeds) result = result.filter((p) => (p.bedrooms ?? 0) >= parseInt(minBeds, 10));
    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      result = result.filter((p) => p.price >= min && p.price <= max);
    }

    // Sort
    switch (sort) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "beds-desc":
        result.sort((a, b) => (b.bedrooms ?? 0) - (a.bedrooms ?? 0));
        break;
      default:
        break; // already ordered by newest from GROQ
    }

    return result;
  }, [properties, status, town, type, minBeds, priceRange, sort, search]);

  const selectClass =
    "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 appearance-none cursor-pointer";

  return (
    <div>
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6 mb-8">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by location, postcode, or keyword..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select value={town} onChange={(e) => setTown(e.target.value)} className={selectClass}>
            <option value="">All Areas</option>
            {towns.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
            <option value="">All Types</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={minBeds}
            onChange={(e) => setMinBeds(e.target.value)}
            className={selectClass}
          >
            {bedroomOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className={selectClass}
          >
            {priceRanges.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-6">
        {filtered.length} {filtered.length === 1 ? "property" : "properties"} found
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((property) => (
            <a
              key={property._id}
              href={`/properties/${property.slug}`}
              className="block bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-gray-100">
                <img
                  src={
                    property.thumbnail?.asset?.url
                      ? `${property.thumbnail.asset.url}?w=600&h=400&fit=crop&auto=format`
                      : "/floorplan-placeholder.svg"
                  }
                  alt={property.thumbnail?.alt || property.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white rounded ${statusColour(property.status)}`}
                >
                  {statusLabel(property.status)}
                </span>
              </div>
              <div className="p-4">
                <p className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  {formatPrice(property.price, property.priceQualifier)}
                </p>
                <h3 className="text-sm font-semibold text-gray-800 mb-1 truncate">
                  {property.title}
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  {[property.town, property.postcode].filter(Boolean).join(", ")}
                </p>
                <div className="flex gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  {property.bedrooms != null && <span>{property.bedrooms} bed</span>}
                  {property.bathrooms != null && <span>{property.bathrooms} bath</span>}
                  {property.sqft != null && (
                    <span>{property.sqft.toLocaleString("en-GB")} sq ft</span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No properties match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setStatus("");
              setTown("");
              setType("");
              setMinBeds("");
              setPriceRange("");
              setSearch("");
            }}
            className="mt-4 text-sm font-semibold underline"
            style={{ color: "var(--color-brand)" }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
