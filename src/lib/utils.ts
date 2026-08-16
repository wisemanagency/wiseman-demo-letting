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
 * Format letting rent for UK display
 * e.g. 1250, "pcm" → "£1,250 pcm"
 *      300, "pw"   → "£300 pw"
 */
export function formatRent(rent: number | null | undefined, period?: string): string {
  if (rent == null) return "";
  const label = period === "pw" ? "pw" : "pcm";
  return `£${rent.toLocaleString("en-GB")} ${label}`;
}

/**
 * Human-readable furnished status label
 */
export function furnishedLabel(furnished: string | null | undefined): string {
  const map: Record<string, string> = {
    furnished: "Furnished",
    "part-furnished": "Part Furnished",
    unfurnished: "Unfurnished",
  };
  return furnished ? (map[furnished] ?? furnished) : "";
}

/**
 * Format letting availability date for UK display.
 * Sanity dates are YYYY-MM-DD strings (no timezone). Parsed as local midnight
 * to avoid the UTC-vs-local off-by-one that `new Date("YYYY-MM-DD")` causes
 * west of UTC. If the parsed date is today or earlier, returns "Available now".
 */
export function formatAvailableFrom(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "";
  const [y, m, d] = parts as [number, number, number];
  const availableDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (availableDate <= today) return "Available now";
  return availableDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
  if (status === "for-sale" || status === "under-offer" || status === "sold-stc")
    return "badge-sale";
  if (status === "for-rent" || status === "let-agreed" || status === "let") return "badge-rent";
  if (status === "sold") return "badge-sale";
  return "badge-muted";
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

/**
 * Build a wa.me click-to-chat link from a free-form phone number.
 * Strips +, spaces, dashes, brackets and any other non-digit characters
 * so editors can type "+44 7911 123456" in Studio and still get a valid
 * link. Returns null if no digits are present so callers can use the
 * result as a truthiness gate.
 *
 *   toWhatsAppLink("+44 7911 123456")
 *     // => "https://wa.me/447911123456"
 *   toWhatsAppLink("+44 7911 123456", "Hi Alice, I'm interested in 12 Main Road")
 *     // => "https://wa.me/447911123456?text=Hi%20Alice%2C%20..."
 */
export function toWhatsAppLink(
  rawNumber: string | null | undefined,
  message?: string
): string | null {
  if (!rawNumber) return null;
  const digits = rawNumber.replace(/\D/g, "");
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
