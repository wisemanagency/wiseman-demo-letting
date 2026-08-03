"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Video {
  _key?: string;
  title?: string;
  videoType?: string;
  videoUrl?: string;
  videoFileUrl?: string;
  thumbnail?: {
    asset?: { url?: string };
  };
}

interface Props {
  videos: Video[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function getYouTubeThumbnail(url: string): string {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

function getVimeoThumbnail(url: string, callback: (url: string) => void): void {
  const id = extractVimeoId(url);
  if (!id) {
    callback("");
    return;
  }
  fetch(`https://vimeo.com/api/v2/video/${id}.json`)
    .then((r) => r.json())
    .then((data) => {
      callback(data?.[0]?.thumbnail_large || "");
    })
    .catch(() => callback(""));
}

function formatUrl(url: string): string {
  return url.replace("http://", "https://");
}

// ─── Video Embed ───────────────────────────────────────────────────────────────

function VideoEmbed({ video }: { video: Video }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup: ensure video pauses when component unmounts
      videoRef.current?.pause();
    };
  }, []);

  if (video.videoType === "YouTube" && video.videoUrl) {
    const id = extractYouTubeId(formatUrl(video.videoUrl));
    if (!id) return null;
    return (
      <iframe
        title={video.title || "Property video tour"}
        src={`https://www.youtube.com/embed/${id}?autoplay=1`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (video.videoType === "Vimeo" && video.videoUrl) {
    const id = extractVimeoId(formatUrl(video.videoUrl));
    if (!id) return null;
    return (
      <iframe
        title={video.title || "Property video tour"}
        src={`https://player.vimeo.com/video/${id}?autoplay=1`}
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (video.videoType === "Upload" && video.videoFileUrl) {
    return (
      <video ref={videoRef} src={video.videoFileUrl} controls autoPlay className="w-full h-full">
        <track kind="captions" srcLang="en" label="English captions" />
      </video>
    );
  }

  return null;
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

function VideoModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Pause video when modal closes
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose]);

  // Click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) handleClose();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: dialog overlay click-outside; close handled by sibling button + global Escape listener
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
        aria-label="Close video"
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

      {/* Video container */}
      <div
        className="relative w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden"
        style={{ maxHeight: "80vh" }}
      >
        <VideoEmbed video={video} />
      </div>

      {/* Video title */}
      {video.title && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-white/80 text-sm">{video.title}</p>
        </div>
      )}
    </div>
  );
}

// ─── Thumbnail ──────────────────────────────────────────────────────────────────

function VideoThumbnail({ video, onClick }: { video: Video; onClick: () => void }) {
  const [thumbUrl, setThumbUrl] = useState<string>("");

  useEffect(() => {
    if (video.thumbnail?.asset?.url) {
      setThumbUrl(video.thumbnail.asset.url);
    } else if (video.videoType === "YouTube" && video.videoUrl) {
      setThumbUrl(getYouTubeThumbnail(video.videoUrl));
    } else if (video.videoType === "Vimeo" && video.videoUrl) {
      getVimeoThumbnail(video.videoUrl, setThumbUrl);
    }
  }, [video]);

  const playIcon = (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
        <svg
          aria-hidden="true"
          className="w-5 h-5 text-gray-800 ml-0.5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-xl overflow-hidden block w-full text-left"
    >
      {/* Thumbnail — 16:9 full width */}
      <div
        className="relative overflow-hidden bg-gray-800"
        style={{ width: "100%", paddingBottom: "56.25%" }}
      >
        {thumbUrl ? (
          <img
            src={`${thumbUrl}?w=1200&h=675&fit=crop&auto=format`}
            alt={video.title || "Video thumbnail"}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
            <svg
              aria-hidden="true"
              className="w-12 h-12 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {playIcon}
      </div>
      {/* Title */}
      {video.title && <p className="text-sm text-gray-700 mt-2 truncate">{video.title}</p>}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function VideoPlayer({ videos }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const openVideo = (index: number) => setActiveIndex(index);
  const closeVideo = useCallback(() => setActiveIndex(null), []);

  if (!videos?.length) return null;

  return (
    <>
      <div className="space-y-4">
        {videos.map((video, index) => (
          <VideoThumbnail
            key={video._key || index}
            video={video}
            onClick={() => openVideo(index)}
          />
        ))}
      </div>

      {activeIndex !== null && videos[activeIndex] && (
        <VideoModal video={videos[activeIndex]} onClose={closeVideo} />
      )}
    </>
  );
}
