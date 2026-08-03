import { defineField, defineType } from "sanity";

export default defineType({
  name: "area",
  title: "Area",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Area Name",
      type: "string",
      description: "e.g. 'Sampletown North', 'Sampletown South'",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 64 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "description",
      title: "Area Description",
      type: "array",
      of: [{ type: "block" }],
      description: "Local SEO content — describe the area, amenities, schools, transport links",
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "metaTitle",
      title: "Meta Title",
      type: "string",
      description: "e.g. 'Homes for Sale in Sampletown | Your Agency'",
    }),
    defineField({
      name: "metaDescription",
      title: "Meta Description",
      type: "text",
      rows: 3,
      validation: (r) => r.max(160),
    }),
  ],
  preview: {
    select: { title: "name", media: "heroImage" },
  },
});
