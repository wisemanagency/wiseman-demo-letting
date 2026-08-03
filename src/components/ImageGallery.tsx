import { useCallback, useEffect, useState } from "react";

interface GalleryImage {
  asset: {
    url: string;
    metadata?: { dimensions?: { width: number; height: number }; lqip?: string };
  };
  alt?: string;
  caption?: string;
}

interface Props {
  images: GalleryImage[];
  title: string;
}

export default function ImageGallery({ images, title }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const prev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex === 0 ? images.length - 1 : lightboxIndex - 1);
  }, [lightboxIndex, images.length]);

  const next = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex === images.length - 1 ? 0 : lightboxIndex + 1);
  }, [lightboxIndex, images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, prev, next, closeLightbox]);

  if (!images?.length) return null;

  const mainImage = images[0];
  const secondaryImages = images.slice(1, 5);
  const remaining = images.length - 5;

  return (
    <>
      {/* Gallery grid */}
      <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-xl overflow-hidden aspect-[2/1] md:aspect-[5/2]">
        {/* Main image — spans 2 cols 2 rows */}
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className="col-span-2 row-span-2 relative overflow-hidden cursor-pointer group"
        >
          <img
            src={`${mainImage.asset.url}?w=1200&h=800&fit=crop&auto=format`}
            alt={mainImage.alt || title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </button>

        {/* Secondary images */}
        {secondaryImages.map((img, i) => (
          <button
            type="button"
            key={img.asset.url}
            onClick={() => openLightbox(i + 1)}
            className="relative overflow-hidden cursor-pointer group"
          >
            <img
              src={`${img.asset.url}?w=400&h=300&fit=crop&auto=format`}
              alt={img.alt || `${title} - image ${i + 2}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* "View more" overlay on last visible image */}
            {i === secondaryImages.length - 1 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">+{remaining} more</span>
              </div>
            )}
          </button>
        ))}

        {/* Fill empty slots if less than 5 images */}
        {secondaryImages.length < 4 &&
          Array.from({ length: 4 - secondaryImages.length }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: synthetic placeholder slots with no stable ID; index is the only valid differentiator and React requires unique keys
              key={`empty-${i}`}
              className="bg-gray-100"
            />
          ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              closeLightbox();
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
            aria-label="Close"
          >
            <svg
              aria-hidden="true"
              className="w-8 h-8"
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

          {/* Previous */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 text-white/80 hover:text-white p-2 z-10"
            aria-label="Previous image"
          >
            <svg
              aria-hidden="true"
              className="w-10 h-10"
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

          {/* Image */}
          <div className="max-w-5xl max-h-[85vh] px-16">
            <img
              src={`${images[lightboxIndex].asset.url}?w=1600&auto=format&q=90`}
              alt={images[lightboxIndex].alt || `${title} - image ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain"
            />
            {images[lightboxIndex].caption && (
              <p className="text-white/70 text-center text-sm mt-3">
                {images[lightboxIndex].caption}
              </p>
            )}
          </div>

          {/* Next */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 text-white/80 hover:text-white p-2 z-10"
            aria-label="Next image"
          >
            <svg
              aria-hidden="true"
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
