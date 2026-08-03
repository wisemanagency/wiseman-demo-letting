"use client";

import { useMemo } from "react";

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
  property: {
    _id: string;
    town?: string;
    propertyType?: string;
  };
  allProperties: Property[];
}

function formatPrice(price: number, qualifier?: string): string {
  if (!price && qualifier === "POA") return "POA";
  const formatted = `£${price.toLocaleString("en-GB")}`;
  return qualifier && qualifier !== "POA" ? `${qualifier} ${formatted}` : formatted;
}

function statusColour(s: string): string {
  if (s === "for-sale" || s === "for-rent") return "bg-green-100 text-green-800";
  if (s === "under-offer" || s === "let-agreed") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    "for-sale": "For Sale",
    "under-offer": "Under Offer",
    "sold-stc": "Sold STC",
    sold: "Sold",
    "for-rent": "To Let",
    "let-agreed": "Let Agreed",
    let: "Let",
  };
  return m[s] || s;
}

function PropertyCard({ p }: { p: Property }) {
  const imageUrl = p.thumbnail?.asset?.url
    ? `${p.thumbnail.asset.url}?w=600&h=400&fit=crop&auto=format`
    : "/floorplan-placeholder.svg";

  return (
    <a
      href={`/properties/${p.slug}`}
      className="block bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={p.thumbnail?.alt || p.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <span
          className={`status-badge absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-semibold ${statusColour(p.status)}`}
        >
          {statusLabel(p.status)}
        </span>
      </div>
      <div className="p-4">
        <p
          className="text-xl font-bold mb-1"
          style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
        >
          {formatPrice(p.price, p.priceQualifier)}
        </p>
        <h3 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-1">{p.title}</h3>
        {(p.town || p.postcode) && (
          <p className="text-xs text-gray-500 mb-3">
            {[p.town, p.postcode].filter(Boolean).join(", ")}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
          {p.bedrooms != null && (
            <span className="flex items-center gap-1">
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"
                />
              </svg>
              {p.bedrooms} bed
            </span>
          )}
          {p.bathrooms != null && (
            <span className="flex items-center gap-1">
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 16h16M4 16V8a4 4 0 014-4h1"
                />
              </svg>
              {p.bathrooms} bath
            </span>
          )}
          {p.sqft != null && <span>{p.sqft.toLocaleString("en-GB")} sq ft</span>}
        </div>
      </div>
    </a>
  );
}

export default function SimilarListings({ property, allProperties }: Props) {
  const displayProperties = useMemo(() => {
    if (!allProperties?.length) return [];

    const candidates = allProperties.filter((p) => {
      if (p._id === property._id) return false;
      const sameTown = p.town?.toLowerCase() === property.town?.toLowerCase();
      const sameType = p.propertyType === property.propertyType;
      return sameTown || sameType;
    });

    if (candidates.length >= 4) return candidates.slice(0, 4);

    const others = allProperties
      .filter((p) => p._id !== property._id && !candidates.find((c) => c._id === p._id))
      .sort(() => Math.random() - 0.5);
    return [...candidates, ...others].slice(0, 4);
  }, [property, allProperties]);

  if (!displayProperties.length) return null;

  return (
    <section className="mt-12 pt-10 border-t border-gray-200">
      <h2
        className="text-2xl font-bold mb-6"
        style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
      >
        Similar Properties
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {displayProperties.map((p) => (
          <PropertyCard key={p._id} p={p} />
        ))}
      </div>
    </section>
  );
}
