import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";

interface Props {
  lat: number;
  lng: number;
  title?: string;
  zoom?: number;
}

export default function MapEmbed({ lat, lng, title = "Property location", zoom = 15 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Dynamic import Leaflet to avoid SSR issues
    const loadMap = async () => {
      const el = mapRef.current;
      if (!el) return;
      const L = await import("leaflet");

      // Fix default marker icons (Leaflet/Webpack issue)
      const DefaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const map = L.map(el, {
        scrollWheelZoom: false,
      }).setView([lat, lng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.marker([lat, lng], { icon: DefaultIcon }).addTo(map).bindPopup(title);

      mapInstance.current = map;
    };

    loadMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [lat, lng, zoom, title]);

  return (
    <div
      ref={mapRef}
      className="w-full h-80 md:h-96 rounded-lg overflow-hidden border border-gray-200"
      style={{ zIndex: 0 }}
    />
  );
}
