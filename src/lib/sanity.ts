import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || "itpavex8",
  dataset: import.meta.env.SANITY_DATASET || "production",
  apiVersion: import.meta.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: !import.meta.env.DEV,
  perspective: "published",
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
