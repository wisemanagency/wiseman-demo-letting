import { defineField, defineType } from "sanity";

export default defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  // Singleton — only one instance via Sanity structure builder
  fields: [
    defineField({
      name: "siteName",
      title: "Site Name",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "siteTagline",
      title: "Tagline",
      type: "string",
      description: "Short strapline shown in hero or header",
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
    }),
    defineField({
      name: "logoDark",
      title: "Logo (Dark variant)",
      type: "image",
      description: "For use on dark backgrounds",
    }),
    defineField({
      name: "favicon",
      title: "Favicon",
      type: "image",
    }),
    defineField({
      name: "primaryColour",
      title: "Primary Brand Colour",
      type: "string",
      description: "Hex value e.g. #1a2b3c — injected as CSS custom property",
      validation: (r) => r.regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex colour"),
    }),
    defineField({
      name: "secondaryColour",
      title: "Secondary Colour",
      type: "string",
      validation: (r) => r.regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex colour"),
    }),
    defineField({
      name: "phone",
      title: "Main Phone Number",
      type: "string",
    }),
    defineField({
      name: "email",
      title: "Main Email",
      type: "string",
    }),
    defineField({
      name: "footerText",
      title: "Footer Text",
      type: "string",
      description: "e.g. '© 2024 Your Agency. All rights reserved.'",
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
                list: ["Facebook", "Instagram", "Twitter", "LinkedIn", "YouTube", "TikTok"],
              },
            },
            { name: "url", title: "URL", type: "url" },
          ],
          preview: {
            select: { title: "platform", subtitle: "url" },
          },
        },
      ],
    }),
    defineField({
      name: "defaultMetaTitle",
      title: "Default Meta Title",
      type: "string",
    }),
    defineField({
      name: "defaultMetaDescription",
      title: "Default Meta Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "ogImage",
      title: "Default OG Image",
      type: "image",
    }),
    defineField({
      name: "googleAnalyticsId",
      title: "Google Analytics ID",
      type: "string",
      description: "e.g. G-XXXXXXXXXX",
    }),
  ],
  preview: {
    select: { title: "siteName", media: "logo" },
  },
});
