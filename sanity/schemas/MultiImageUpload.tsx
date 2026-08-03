"use client";

import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageAsset } from "@sanity/image-url/lib/types/types";
import { nanoid } from "nanoid";
import { useCallback, useRef, useState } from "react";
import { PatchEvent, set, useClient } from "sanity";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ImageItem {
  _key: string;
  _type: "image";
  asset: { _type: "reference"; _ref: string };
  alt?: string;
  caption?: string;
}

interface Props {
  value?: ImageItem[];
  onChange: (patch: PatchEvent) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MultiImageUpload({ value = [], onChange }: Props) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const builder = imageUrlBuilder(client);
  const getUrl = (asset: { _ref: string }) =>
    builder.image(asset).width(120).height(120).fit("crop").auto("format").url();

  // ── Upload ────────────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      setUploading(true);
      try {
        const results = await Promise.all(
          files.map((file) =>
            client.assets.upload("image", file, {
              contentType: file.type,
              filename: file.name,
            })
          )
        );

        const newItems: ImageItem[] = results.map((result: SanityImageAsset) => ({
          _key: nanoid(12),
          _type: "image",
          asset: {
            _type: "reference",
            _ref: result._id,
          },
        }));

        const updated = [...(value ?? []), ...newItems];
        onChange(PatchEvent.from([set(updated)]));
        alert(`${newItems.length} image${newItems.length > 1 ? "s" : ""} uploaded`);
      } catch (err) {
        alert(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [client, onChange, value]
  );

  // ── Delete ────────────────────────────────────────────────────────────
  const removeImage = useCallback(
    (key: string) => {
      const current = (value ?? []).filter((item) => item._key !== key);
      onChange(PatchEvent.from([set(current)]));
    },
    [value, onChange]
  );

  // ── Drag-to-reorder (HTML5 native) ────────────────────────────────────
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && index !== dragIndex) {
      setOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIndex) {
      const reordered = [...(value ?? [])];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      onChange(PatchEvent.from([set(reordered)]));
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const items = (value ?? []).map((item) => ({
    ...item,
    url: item.asset?._ref ? getUrl(item.asset) : "",
  }));

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-state cleanup hook only; upload affordance handled by sibling file input label
    <div className="space-y-3" onMouseUp={handleDragEnd}>
      {/* Image grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-8 gap-2">
          {items.map((item, index) => {
            const isBeingDragged = dragIndex === index;
            const isDropTarget = overIndex === index && dragIndex !== index;
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop cell; delete affordance handled by sibling Remove button
              <div
                key={item._key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative flex flex-col items-center gap-1
                  ${isBeingDragged ? "opacity-30" : ""}
                  ${isDropTarget ? "scale-90" : ""}
                `}
              >
                {/* Thumbnail */}
                <div
                  className={`
                    relative rounded overflow-hidden border-2 cursor-grab active:cursor-grabbing select-none
                    transition-all duration-100
                    ${isBeingDragged ? "border-blue-400" : isDropTarget ? "border-blue-500 ring-2 ring-blue-500" : index === 0 ? "border-yellow-400" : "border-gray-200 hover:border-gray-400"}
                  `}
                >
                  <img
                    src={item.url}
                    alt={item.alt || ""}
                    className="block w-16 h-16 object-cover"
                  />

                  {/* Badge */}
                  <span
                    className={`
                    absolute bottom-0 left-0 right-0 text-center text-xs font-bold py-0.5
                    ${index === 0 ? "bg-yellow-400 text-yellow-900" : "bg-black/60 text-white"}
                  `}
                  >
                    {index === 0 ? "★ Main" : index + 1}
                  </span>
                </div>

                {/* Delete link */}
                <button
                  type="button"
                  onClick={() => removeImage(item._key)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload section */}
      <div>
        <label
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-colors ${
            uploading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {uploading ? "Uploading…" : "Upload Images"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
        {items.length === 0 && !uploading && (
          <p className="text-xs text-gray-400 mt-2">No images yet — click above to upload.</p>
        )}
        {items.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Drag images to reorder — ★ Main is the first photo.
          </p>
        )}
      </div>
    </div>
  );
}
