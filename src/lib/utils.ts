/**
 * Format price for UK display
 * e.g. 450000 → "£450,000"
 */
export function formatPrice(price: number | null | undefined, qualifier?: string): string {
  if (!price && qualifier === "POA") return "POA";
  if (!price) return "Price on application";

  const formatted = `£${price.toLocaleString("en-GB")}`;
  if (qualifier && qualifier !== "POA") {
    return `${qualifier} ${formatted}`;
  }
  return formatted;
}

/**
 * Human-readable status badge text
 */
export function statusLabel(status: string): string {
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

/**
 * Status badge colour class (Tailwind)
 */
export function statusColour(status: string): string {
  if (status === "for-sale" || status === "for-rent") return "bg-green-600 text-white";
  if (status === "under-offer" || status === "let-agreed") return "bg-amber-500 text-white";
  if (status === "sold" || status === "sold-stc" || status === "let")
    return "bg-red-600 text-white";
  return "bg-gray-500 text-white";
}

/**
 * EPC colour mapping
 */
export function epcColour(rating: string): string {
  const map: Record<string, string> = {
    A: "#009036",
    B: "#19b459",
    C: "#8dce46",
    D: "#ffd500",
    E: "#fcaa65",
    F: "#ef8023",
    G: "#e9153b",
  };
  return map[rating] || "#999";
}

/**
 * Build a property summary line
 * e.g. "3 bed semi-detached · Freehold · 1,200 sq ft"
 */
export function propertySummary(property: {
  bedrooms?: number;
  propertyType?: string;
  tenure?: string;
  sqft?: number;
}): string {
  const parts: string[] = [];
  if (property.bedrooms != null) parts.push(`${property.bedrooms} bed`);
  if (property.propertyType) parts.push(property.propertyType.toLowerCase());
  if (property.tenure) parts.push(property.tenure);
  if (property.sqft) parts.push(`${property.sqft.toLocaleString("en-GB")} sq ft`);
  return parts.join(" · ");
}

/**
 * Build full address string
 */
export function fullAddress(property: {
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  county?: string;
  postcode?: string;
}): string {
  return [
    property.addressLine1,
    property.addressLine2,
    property.town,
    property.county,
    property.postcode,
  ]
    .filter(Boolean)
    .join(", ");
}
