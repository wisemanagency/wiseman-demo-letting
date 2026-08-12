import { defineField, defineType } from "sanity";

export default defineType({
  name: "post",
  title: "Blog Post",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "media", title: "Media" },
    { name: "meta", title: "Author & Dates" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    // ── Content ──
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (r) => r.required().max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      group: "content",
      rows: 3,
      description: "Short summary shown on listing cards and used as the meta description fallback.",
      validation: (r) => r.required().max(200),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      group: "content",
      of: [
        { type: "block" },
        {
          type: "image",
          options: { hotspot: true },
          fields: [{ name: "alt", type: "string", title: "Alt text" }],
        },
      ],
    }),

    // ── Media ──
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      group: "media",
      options: { hotspot: true },
      description:
        "Required. Used on listing cards (4:3) and social sharing (1.91:1). Use the hotspot tool to mark the focal point.",
      validation: (r) => r.required(),
      fields: [
        { name: "alt", type: "string", title: "Alt text", validation: (r) => r.required() },
      ],
    }),

    // ── Author & Dates ──
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      group: "meta",
      to: [{ type: "agent" }],
      description: "Optional — falls back to the site name on the post if blank.",
    }),
    defineField({
      name: "publishedAt",
      title: "Published Date",
      type: "datetime",
      group: "meta",
      description:
        "Posts are only visible on /blog once this date/time has passed. Note: stored as UTC, so BST users scheduling 'midnight tomorrow' will go live the day before.",
      validation: (r) => r.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "readTime",
      title: "Read Time (minutes)",
      type: "number",
      group: "meta",
      description: "Manual estimate. Sanity can't reliably auto-derive word counts on save.",
      validation: (r) => r.min(1).max(60),
      initialValue: 3,
    }),

    // ── SEO ──
    defineField({
      name: "metaTitle",
      title: "Meta Title",
      type: "string",
      group: "seo",
      description: "Overrides the auto-generated title tag.",
    }),
    defineField({
      name: "metaDescription",
      title: "Meta Description",
      type: "text",
      group: "seo",
      rows: 3,
      validation: (r) => r.max(160),
    }),
    defineField({
      name: "ogImage",
      title: "Open Graph Image",
      type: "image",
      group: "seo",
      description: "If empty, the cover image is used.",
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "coverImage",
      publishedAt: "publishedAt",
    },
    prepare({ title, author, media, publishedAt }) {
      const date = publishedAt
        ? new Date(publishedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Unscheduled";
      return {
        title,
        subtitle: `${author ? `${author} · ` : ""}${date}`,
        media,
      };
    },
  },
  orderings: [
    {
      title: "Published (Newest)",
      name: "publishedDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
    {
      title: "Published (Oldest)",
      name: "publishedAsc",
      by: [{ field: "publishedAt", direction: "asc" }],
    },
    { title: "Title A–Z", name: "titleAsc", by: [{ field: "title", direction: "asc" }] },
  ],
});