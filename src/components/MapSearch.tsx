import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ──
interface PropertyListing {
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
  location?: { lat: number; lng: number };
  features?: string[];
  epc?: string;
  thumbnail?: {
    asset: { url: string; metadata?: { lqip?: string } };
    alt?: string;
  };
}

interface Props {
  properties: PropertyListing[];
  towns: string[];
  propertyTypes: string[];
  mapCenter?: { lat: number; lng: number };
  mapZoom?: number;
}

// ── Helpers ──
function formatPrice(price: number, qualifier?: string): string {
  if (!price && qualifier === "POA") return "POA";
  const formatted = `£${price.toLocaleString("en-GB")}`;
  return qualifier && qualifier !== "POA" ? `${qualifier} ${formatted}` : formatted;
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

function statusDot(s: string): string {
  if (s === "for-sale" || s === "for-rent") return "#16a34a";
  if (s === "under-offer" || s === "let-agreed") return "#d97706";
  return "#dc2626";
}

// ── Marker popup close-timer tracking ──
const closeTimers = new WeakMap<LeafletMarker, ReturnType<typeof setTimeout> | null>();

// ── Price range presets ──
const PRICE_RANGES = [
  { value: "", label: "Any price" },
  { value: "0-250000", label: "Up to £250k" },
  { value: "250000-500000", label: "£250k – £500k" },
  { value: "500000-750000", label: "£500k – £750k" },
  { value: "750000-1000000", label: "£750k – £1m" },
  { value: "1000000-2000000", label: "£1m – £2m" },
  { value: "2000000-999999999", label: "£2m+" },
];

const BED_OPTIONS = [
  { value: "", label: "Any beds" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "for-sale", label: "For sale" },
  { value: "for-rent", label: "To let" },
  { value: "under-offer", label: "Under offer" },
];

const SORT_OPTIONS = [
  { value: "price-desc", label: "Price (high–low)" },
  { value: "price-asc", label: "Price (low–high)" },
  { value: "beds-desc", label: "Most bedrooms" },
  { value: "newest", label: "Newest" },
];

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════
export default function MapSearch({
  properties,
  towns,
  propertyTypes,
  mapCenter = { lat: 51.5074, lng: -0.1278 },
  mapZoom = 11,
}: Props) {
  // ── Filter state ──
  const [status, setStatus] = useState("");
  const [town, setTown] = useState("");
  const [type, setType] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [sort, setSort] = useState("price-desc");
  const [search, setSearch] = useState("");

  // ── Interaction state ──
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // ── Refs ──
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const listRefs = useRef<Map<string, HTMLElement>>(new Map());
  const LRef = useRef<typeof import("leaflet") | null>(null);

  // ── Filtered + sorted ──
  const filtered = useMemo(() => {
    let result = [...properties].filter((p) => p.location?.lat && p.location?.lng);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.town?.toLowerCase().includes(q) ||
          p.postcode?.toLowerCase().includes(q)
      );
    }
    if (status) result = result.filter((p) => p.status === status);
    if (town) result = result.filter((p) => p.town === town);
    if (type) result = result.filter((p) => p.propertyType === type);
    if (minBeds) result = result.filter((p) => (p.bedrooms ?? 0) >= parseInt(minBeds, 10));
    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      result = result.filter((p) => p.price >= min && p.price <= max);
    }

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
    }

    return result;
  }, [properties, status, town, type, minBeds, priceRange, sort, search]);

  // ── Init Leaflet ──
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-time init; view changes handled by the sync effect below
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      const el = mapRef.current;
      if (!el) return;
      try {
        const L = await import("leaflet");
        LRef.current = L;

        const map = L.map(el, {
          scrollWheelZoom: false,
          zoomControl: true,
        }).setView([mapCenter.lat, mapCenter.lng], mapZoom);

        if (map.zoomControl) {
          map.zoomControl.setPosition("topright");
        }

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        mapInstance.current = map;
        setMapReady(true);
      } catch (err) {
        console.error("Map failed to load:", err);
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // ── Sync view with mapCenter/mapZoom props ──
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setView([mapCenter.lat, mapCenter.lng], mapZoom);
  }, [mapCenter.lat, mapCenter.lng, mapZoom]);

  // ── Create custom marker icon ──
  const createIcon = useCallback(
    (price: number, _qualifier: string | undefined, isHovered: boolean, isSelected: boolean) => {
      const L = LRef.current;
      if (!L) return null;

      const label =
        price >= 1000000 ? `£${(price / 1000000).toFixed(1)}m` : `£${Math.round(price / 1000)}k`;

      const bg = isSelected
        ? "var(--color-brand, #1a3a5c)"
        : isHovered
          ? "var(--color-brand-light, #2a5a8c)"
          : "#ffffff";
      const color = isSelected || isHovered ? "#ffffff" : "var(--color-brand, #1a3a5c)";
      const border = isSelected || isHovered ? "transparent" : "var(--color-brand, #1a3a5c)";
      const scale = isHovered ? "scale(1.15)" : "scale(1)";
      const shadow = isSelected
        ? "0 4px 12px rgba(0,0,0,0.3)"
        : isHovered
          ? "0 2px 8px rgba(0,0,0,0.2)"
          : "0 1px 4px rgba(0,0,0,0.15)";
      const zIdx = isSelected ? 1000 : isHovered ? 999 : 1;

      return L.divIcon({
        className: "",
        html: `<div style="
        background:${bg}; color:${color}; border:2px solid ${border};
        padding:5px 12px; border-radius:8px; font-size:13px; font-weight:700;
        font-family:var(--font-body, system-ui, sans-serif);
        white-space:nowrap; transform:${scale}; transition:all 0.15s ease;
        box-shadow:${shadow}; z-index:${zIdx}; position:relative;
        cursor:pointer; min-width:60px; text-align:center;
      ">${label}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
    },
    []
  );

  // ── Sync markers with filtered properties ──
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    // Remove old markers
    for (const marker of markersRef.current.values()) {
      map.removeLayer(marker);
    }
    markersRef.current.clear();

    // Add new markers
    const bounds: [number, number][] = [];

    filtered.forEach((p) => {
      if (!p.location) return;
      const { lat, lng } = p.location;
      bounds.push([lat, lng]);

      const icon = createIcon(p.price, p.priceQualifier, false, false);
      if (!icon) return;

      const marker = L.marker([lat, lng], { icon, zIndexOffset: 0 })
        .addTo(map)
        .on("click", () => {
          setSelectedId(p._id);
          // Scroll sidebar to this card
          const el = listRefs.current.get(p._id);
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        })
        .on("mouseover", () => {
          setHoveredId(p._id);
          marker.openPopup();
        });

      // Bind popup
      const thumbUrl = p.thumbnail?.asset?.url
        ? `${p.thumbnail.asset.url}?w=280&h=160&fit=crop&auto=format`
        : "";
      const popupContent = `
        <div style="font-family:var(--font-body,system-ui,sans-serif);max-width:300px;">
          ${thumbUrl ? `<img src="${thumbUrl}" style="width:280px;height:160px;object-fit:cover;border-radius:8px 8px 0 0;background:#f3f4f6;display:block;" />` : `<div style="width:280px;height:160px;background:#f3f4f6;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#9ca3af;">No image</div>`}
          <div style="padding:10px 12px 12px;">
            <div style="font-weight:700;font-size:18px;color:#111;margin-bottom:2px;">${formatPrice(p.price, p.priceQualifier)}</div>
            <div style="font-size:13px;color:#374151;margin-bottom:4px;font-weight:500;">${p.title}</div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">${[p.town, p.postcode].filter(Boolean).join(", ")}</div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:${p.epc ? "4px" : "8px"};">
              ${[p.bedrooms != null ? `${p.bedrooms} bed` : null, p.bathrooms != null ? `${p.bathrooms} bath` : null, p.sqft ? `${p.sqft.toLocaleString()} ft²` : null, p.propertyType].filter(Boolean).join(" · ")}
            </div>
            ${p.epc ? `<div style="font-size:11px;color:#6b7280;margin-bottom:8px;">EPC: <span style="font-weight:600;">${p.epc}</span></div>` : ""}
            <a href="/properties/${p.slug}" style="display:inline-block;background:var(--color-brand,#1a3a5c);color:#fff;font-size:12px;font-weight:600;padding:6px 14px;border-radius:6px;text-decoration:none;">View details →</a>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent, {
        maxWidth: 300,
        closeButton: false,
        autoPan: true,
        autoPanPadding: [200, 200],
      });

      // Track popup hover — clear close timer when entering popup, start timer when leaving
      marker.on("popupopen", () => {
        const popup = marker.getPopup();
        if (!popup) return;
        const el = popup.getElement?.();
        if (!el) return;
        const content = el.querySelector(".leaflet-popup-content");
        if (!content) return;

        content.addEventListener("mouseenter", () => {
          const timer = closeTimers.get(marker);
          if (timer) {
            clearTimeout(timer);
            closeTimers.set(marker, null);
          }
        });
        content.addEventListener("mouseleave", () => {
          closeTimers.set(
            marker,
            setTimeout(() => {
              marker.closePopup();
            }, 400)
          );
        });
      });

      markersRef.current.set(p._id, marker);
    });

    // Fit bounds only when filtered properties actually change (not on hover/select)
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [filtered, mapReady, createIcon]);

  // ── Update individual marker icons on hover/select change ──
  useEffect(() => {
    if (!mapReady || !LRef.current) return;

    markersRef.current.forEach((marker, id) => {
      const p = filtered.find((x) => x._id === id);
      if (!p) return;
      const icon = createIcon(p.price, p.priceQualifier, id === hoveredId, id === selectedId);
      if (icon) marker.setIcon(icon);
      marker.setZIndexOffset(id === selectedId ? 1000 : id === hoveredId ? 999 : 0);
    });
  }, [hoveredId, selectedId, filtered, mapReady, createIcon]);

  // ── Sidebar card hover → pan map ──
  const handleCardHover = useCallback((id: string | null) => {
    setHoveredId(id);
    if (id && mapInstance.current) {
      const marker = markersRef.current.get(id);
      if (marker) {
        const latlng = marker.getLatLng();
        const map = mapInstance.current;
        if (!map.getBounds().contains(latlng)) {
          map.panTo(latlng, { animate: true, duration: 0.3 });
        }
      }
    }
  }, []);

  const handleCardClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    const marker = markersRef.current.get(id);
    if (marker && mapInstance.current) {
      mapInstance.current.panTo(marker.getLatLng(), { animate: true, duration: 0.3 });
      marker.openPopup();
    }
  }, []);

  const clearFilters = () => {
    setStatus("");
    setTown("");
    setType("");
    setMinBeds("");
    setPriceRange("");
    setSearch("");
  };

  const hasActiveFilters = status || town || type || minBeds || priceRange || search;

  // ── Select styling ──
  const selCls =
    "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 appearance-none cursor-pointer";

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)] overflow-hidden bg-gray-50">
      {/* ═══ SIDEBAR ═══ */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col border-r border-gray-200 bg-white order-2 lg:order-1 h-1/2 lg:h-full">
        {/* Search + filter toggle */}
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search area, postcode..."
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                filtersOpen || hasActiveFilters
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
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
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </button>
          </div>

          {/* Expandable filters */}
          {filtersOpen && (
            <div className="mt-3 pb-2 space-y-2 animate-slideDown">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={selCls}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select value={town} onChange={(e) => setTown(e.target.value)} className={selCls}>
                  <option value="">All areas</option>
                  {towns.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select value={type} onChange={(e) => setType(e.target.value)} className={selCls}>
                  <option value="">All types</option>
                  {propertyTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={minBeds}
                  onChange={(e) => setMinBeds(e.target.value)}
                  className={selCls}
                >
                  {BED_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className={selCls}
                >
                  {PRICE_RANGES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className={selCls}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-50 flex items-center justify-between">
          <span>
            {filtered.length} {filtered.length === 1 ? "property" : "properties"}
          </span>
          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-blue-600 hover:underline"
            >
              Clear selection
            </button>
          )}
        </div>

        {/* Scrollable property list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <svg
                aria-hidden="true"
                className="w-12 h-12 text-gray-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p className="text-gray-500 text-sm font-medium mb-1">No properties found</p>
              <p className="text-gray-400 text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <button
                  type="button"
                  key={p._id}
                  ref={(el) => {
                    if (el) listRefs.current.set(p._id, el);
                  }}
                  onMouseEnter={() => handleCardHover(p._id)}
                  onMouseLeave={() => handleCardHover(null)}
                  onClick={() => handleCardClick(p._id)}
                  className={`flex gap-3 p-3 w-full text-left cursor-pointer transition-all duration-150 ${
                    selectedId === p._id
                      ? "bg-blue-50 border-l-[3px] border-l-blue-500"
                      : hoveredId === p._id
                        ? "bg-gray-50 border-l-[3px] border-l-gray-300"
                        : "border-l-[3px] border-l-transparent hover:bg-gray-50"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-28 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    {p.thumbnail?.asset?.url ? (
                      <img
                        src={`${p.thumbnail.asset.url}?w=224&h=160&fit=crop&auto=format`}
                        alt={p.thumbnail.alt || p.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          aria-hidden="true"
                          className="w-8 h-8 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-base font-bold text-gray-900 leading-tight"
                        style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
                      >
                        {formatPrice(p.price, p.priceQualifier)}
                      </p>
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex-shrink-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: statusDot(p.status) }}
                        />
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium truncate mt-0.5">{p.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {[p.town, p.postcode].filter(Boolean).join(", ")}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                      {p.bedrooms != null && <span>{p.bedrooms} bed</span>}
                      {p.bathrooms != null && <span>{p.bathrooms} bath</span>}
                      {p.sqft != null && <span>{p.sqft.toLocaleString()} ft²</span>}
                      {p.propertyType && <span className="text-gray-400">{p.propertyType}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          <a
            href="/valuation"
            className="block w-full text-center py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--color-brand, #1a3a5c)" }}
          >
            Book a Free Valuation
          </a>
        </div>
      </div>

      {/* ═══ MAP ═══ */}
      <div className="flex-1 relative order-1 lg:order-2 h-1/2 lg:h-full">
        <div ref={mapRef} className="w-full h-full" />

        {/* Map overlay: property count badge */}
        <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200">
          {filtered.length} {filtered.length === 1 ? "property" : "properties"} on map
        </div>

        {/* Map loading state */}
        {!mapReady && (
          <div className="absolute inset-0 z-[500] bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 300px; }
        }
        .animate-slideDown { animation: slideDown 0.2s ease-out; }
        .leaflet-popup-content-wrapper { border-radius: 8px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important; }
        .leaflet-popup-content { margin: 10px 12px !important; }
        .leaflet-popup-tip { box-shadow: none !important; }
      `}</style>
    </div>
  );
}
