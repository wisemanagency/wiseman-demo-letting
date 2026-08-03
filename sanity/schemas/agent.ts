import { defineField, defineType } from "sanity";

export default defineType({
  name: "agent",
  title: "Agent",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Full Name",
      type: "string",
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
      name: "role",
      title: "Job Title",
      type: "string",
      description: "e.g. 'Senior Negotiator', 'Branch Manager', 'Lettings Director'",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "photo",
      title: "Profile Photo",
      type: "image",
      options: { hotspot: true },
      description: "Professional headshot — square or portrait crop works best",
    }),
    defineField({
      name: "bio",
      title: "About",
      type: "array",
      of: [{ type: "block" }],
      description: "Short bio — background, specialisms, why clients trust them",
    }),
    defineField({
      name: "phone",
      title: "Phone",
      type: "string",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (r) => r.email(),
    }),
    defineField({
      name: "whatsapp",
      title: "WhatsApp Number",
      type: "string",
      description: "International format without + or spaces, e.g. 447700900123",
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "platform",
              title: "Platform",
              type: "string",
              options: {
                list: ["LinkedIn", "Instagram", "Facebook", "Twitter", "TikTok", "YouTube"],
              },
            },
            {
              name: "url",
              title: "URL",
              type: "url",
            },
          ],
          preview: {
            select: { title: "platform", subtitle: "url" },
          },
        },
      ],
    }),
    defineField({
      name: "specialisms",
      title: "Specialisms",
      type: "array",
      of: [{ type: "string" }],
      description: "e.g. 'Residential Sales', 'New Builds', 'Luxury Homes', 'Lettings'",
    }),
    defineField({
      name: "branch",
      title: "Branch",
      type: "reference",
      to: [{ type: "branch" }],
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first (e.g. 1 = top of the team page)",
      initialValue: 10,
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      description: "Uncheck to hide from the website without deleting",
      initialValue: true,
    }),
    defineField({
      name: "metaTitle",
      title: "Meta Title",
      type: "string",
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
    select: {
      title: "name",
      subtitle: "role",
      media: "photo",
      active: "active",
    },
    prepare({ title, subtitle, media, active }) {
      return {
        title: `${active === false ? "🚫 " : ""}${title}`,
        subtitle,
        media,
      };
    },
  },
  orderings: [
    {
      title: "Display Order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
    {
      title: "Name A–Z",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
  ],
});
