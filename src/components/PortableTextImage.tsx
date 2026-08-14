import urlBuilder from "@sanity/image-url";
import { sanityClient } from "@/lib/sanity";

// Renders an inline image block from a Sanity PortableText body. Sanity stores
// the image as `{ _type: "image", asset: { _ref: "image-..." }, alt?: "..." }`;
// we resolve the asset through the project's image URL builder so the browser
// gets a properly-sized WebP with the CDN's transform pipeline.
//
// React + Astro: this is a default export so the build's `components` map
// stays type-safe without needing a wrapping client directive.
interface ImageValue {
  asset?: { _ref?: string; url?: string; metadata?: { lqip?: string } };
  alt?: string;
  caption?: string;
}

const builder = urlBuilder(sanityClient);

export default function PortableTextImage({ value }: { value: ImageValue }) {
  if (!value?.asset) return null;

  const imageUrl = value.asset._ref
    ? builder.image(value.asset._ref).width(1200).fit("max").auto("format").url()
    : value.asset.url
      ? `${value.asset.url}?w=1200&fit=max&auto=format`
      : null;

  if (!imageUrl) return null;

  const lqip = value.asset.metadata?.lqip;
  const alt = value.alt || "";

  return (
    <figure className="my-8">
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full h-auto rounded-lg"
        style={lqip ? { backgroundImage: `url(${lqip})`, backgroundSize: "cover" } : undefined}
      />
      {value.caption && (
        <figcaption
          className="text-sm text-center mt-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          {value.caption}
        </figcaption>
      )}
    </figure>
  );
}
