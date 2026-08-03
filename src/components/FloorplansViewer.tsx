"use client";

import { useCallback, useEffect, useState } from "react";

interface Floorplan {
  _key?: string;
  label?: string;
  image?: {
    asset?: { url?: string };
  };
}

interface Props {
  floorplans: Floorplan[];
}

function FloorplanLightbox({
  floorplans,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onGoTo,
}: {
  floorplans: Floorplan[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (i: number) => void;
}) {
  // Escape key
  useEffect(() => {
    const current = floorplans[currentIndex];
    if (!current?.image?.asset?.url) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext, currentIndex, floorplans]);

  const current = floorplans[currentIndex];
  if (!current?.image?.asset?.url) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-4">
        <p className="text-white/80 text-sm font-medium">
          {current.label || `Floor Plan ${currentIndex + 1}`} — {currentIndex + 1} of{" "}
          {floorplans.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          aria-label="Close"
        >
          <svg
            aria-hidden="true"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Image */}
      <div className="relative flex-1 flex items-center justify-center w-full max-w-5xl">
        <img
          src={`${current.image.asset.url}?w=1400&auto=format`}
          alt={current.label || "Floor plan"}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
          style={{ maxHeight: "80vh" }}
        />

        {/* Prev */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
            aria-label="Previous floor plan"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Next */}
        {currentIndex < floorplans.length - 1 && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
            aria-label="Next floor plan"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {floorplans.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1" style={{ maxWidth: "100%" }}>
          {floorplans.map((fp, i) => (
            <button
              type="button"
              key={fp._key || i}
              onClick={(e) => {
                e.stopPropagation();
                onGoTo(i);
              }}
              className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-colors ${
                i === currentIndex
                  ? "border-white"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {fp.image?.asset?.url ? (
                <img
                  src={`${fp.image.asset.url}?w=128&h=96&fit=crop&auto=format`}
                  alt={fp.label || `Floor plan ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FloorplansViewer({ floorplans }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const current = floorplans[currentIndex];

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(floorplans.length - 1, i + 1));
  }, [floorplans.length]);

  const goTo = useCallback((i: number) => {
    setCurrentIndex(i);
  }, []);

  const openLightbox = () => setLightboxOpen(true);
  const closeLightbox = () => setLightboxOpen(false);

  if (!floorplans?.length) return null;

  const currentUrl = current?.image?.asset?.url
    ? `${current.image.asset.url}?w=1200&auto=format`
    : "";

  return (
    <>
      {/* Filmstrip thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
        {floorplans.map((fp, i) => (
          <button
            type="button"
            key={fp._key || i}
            onClick={() => setCurrentIndex(i)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-lg overflow-hidden border-2 transition-all ${
              i === currentIndex
                ? "border-[var(--color-brand,#1a3a5c)]"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            {fp.image?.asset?.url ? (
              <img
                src={`${fp.image.asset.url}?w=200&h=150&fit=crop&auto=format`}
                alt={fp.label || `Floor plan ${i + 1}`}
                className="w-20 h-16 object-cover"
              />
            ) : (
              <div className="w-20 h-16 bg-gray-100 flex items-center justify-center">
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
            )}
            <span
              className={`text-xs px-1 pb-1 truncate max-w-[80px] ${
                i === currentIndex
                  ? "text-[var(--color-brand,#1a3a5c)] font-semibold"
                  : "text-gray-500"
              }`}
            >
              {fp.label || `Floor ${i + 1}`}
            </span>
          </button>
        ))}
      </div>

      {/* Main display */}
      {currentUrl && (
        <div className="relative mt-4 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group">
          <button
            type="button"
            onClick={openLightbox}
            className="block w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`View floor plan: ${current.label || "Floor plan"}`}
          >
            <img
              src={currentUrl}
              alt={current.label || "Floor plan"}
              className="w-full h-auto object-contain"
              style={{ maxHeight: "500px" }}
            />
          </button>

          {/* Click hint */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <svg
                aria-hidden="true"
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
              Click to enlarge
            </span>
          </div>

          {/* Prev/Next on main display */}
          {floorplans.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-gray-800 rounded-full shadow transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Previous"
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
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}
              {currentIndex < floorplans.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-gray-800 rounded-full shadow transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Next"
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <FloorplanLightbox
          floorplans={floorplans}
          currentIndex={currentIndex}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
          onGoTo={goTo}
        />
      )}
    </>
  );
}
