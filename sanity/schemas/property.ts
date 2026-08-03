import { defineField, defineType, type Rule } from "sanity";
import MultiImageUpload from "./MultiImageUpload";

export default defineType({
  name: "property",
  title: "Property",
  type: "document",
  groups: [
    { name: "details", title: "Details", default: true },
    { name: "location", title: "Location" },
    { name: "media", title: "Media" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    // ── Core Details ──
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "details",
      description: "e.g. '3 Bedroom Semi-Detached House, Maple Road'",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "details",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      group: "details",
      options: {
        list: [
          { title: "For Sale", value: "for-sale" },
          { title: "Under Offer", value: "under-offer" },
          { title: "Sold STC", value: "sold-stc" },
          { title: "Sold", value: "sold" },
          { title: "For Rent", value: "for-rent" },
          { title: "Let Agreed", value: "let-agreed" },
          { title: "Let", value: "let" },
        ],
        layout: "radio",
      },
      initialValue: "for-sale",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "propertyType",
      title: "Property Type",
      type: "string",
      group: "details",
      options: {
        list: [
          "Detached",
          "Semi-Detached",
          "Terraced",
          "End Terrace",
          "Flat",
          "Maisonette",
          "Bungalow",
          "Cottage",
          "Town House",
          "Commercial",
          "Land",
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "price",
      title: "Price (£)",
      type: "number",
      group: "details",
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: "priceQualifier",
      title: "Price Qualifier",
      type: "string",
      group: "details",
      options: {
        list: ["Guide Price", "Offers Over", "Offers In Region Of", "Fixed Price", "From", "POA"],
      },
      initialValue: "Guide Price",
    }),
    defineField({
      name: "bedrooms",
      title: "Bedrooms",
      type: "number",
      group: "details",
      validation: (r) => r.required().min(0).max(20),
    }),
    defineField({
      name: "bathrooms",
      title: "Bathrooms",
      type: "number",
      group: "details",
      validation: (r) => r.min(0).max(20),
    }),
    defineField({
      name: "receptionRooms",
      title: "Reception Rooms",
      type: "number",
      group: "details",
      validation: (r) => r.min(0).max(10),
    }),
    defineField({
      name: "sqft",
      title: "Size (sq ft)",
      type: "number",
      group: "details",
      validation: (r) => r.min(0),
    }),
    defineField({
      name: "tenure",
      title: "Tenure",
      type: "string",
      group: "details",
      options: {
        list: ["Freehold", "Leasehold", "Share of Freehold", "Commonhold"],
      },
    }),
    defineField({
      name: "epc",
      title: "EPC Rating",
      type: "string",
      group: "details",
      options: {
        list: ["A", "B", "C", "D", "E", "F", "G"],
        layout: "radio",
        direction: "horizontal",
      },
    }),
    defineField({
      name: "councilTaxBand",
      title: "Council Tax Band",
      type: "string",
      group: "details",
      options: {
        list: ["A", "B", "C", "D", "E", "F", "G", "H"],
      },
    }),
    defineField({
      name: "description",
      title: "Full Description",
      type: "array",
      group: "details",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "features",
      title: "Key Features",
      type: "array",
      group: "details",
      of: [{ type: "string" }],
      description: "e.g. 'South-facing garden', 'Chain free', 'Garage'",
    }),

    // ── Location ──
    defineField({
      name: "addressLine1",
      title: "Address Line 1",
      type: "string",
      group: "location",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "addressLine2",
      title: "Address Line 2",
      type: "string",
      group: "location",
    }),
    defineField({
      name: "town",
      title: "Town / City",
      type: "string",
      group: "location",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "county",
      title: "County",
      type: "string",
      group: "location",
    }),
    defineField({
      name: "postcode",
      title: "Postcode",
      type: "string",
      group: "location",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "location",
      title: "Map Location",
      type: "geopoint",
      group: "location",
      description: "Pin location on the map for listing display",
    }),

    // ── Media ──
    defineField({
      name: "images",
      title: "Property Images",
      type: "array",
      group: "media",
      options: {
        sortable: true,
        layout: "grid",
      },
      of: [
        {
          type: "image",
          options: {
            hotspot: true,
            storeOriginalFilename: true,
          },
          fields: [
            {
              name: "alt",
              title: "Alt Text",
              type: "string",
            },
            {
              name: "caption",
              title: "Caption",
              type: "string",
            },
          ],
        },
      ],
      validation: (r) => r.min(1),
      components: {
        input: MultiImageUpload,
      },
    }),
    defineField({
      name: "floorplans",
      title: "Floorplans",
      type: "array",
      group: "media",
      description: "Add multiple floor plans — use labels like 'Ground Floor', 'First Floor', etc.",
      of: [
        {
          type: "object",
          name: "floorplanItem",
          title: "Floor Plan",
          fields: [
            {
              name: "label",
              title: "Label",
              type: "string",
              description: "e.g. Ground Floor, First Floor, Second Floor",
              validation: (r: Rule) => r.required(),
            },
            {
              name: "image",
              title: "Floor Plan Image",
              type: "image",
              options: { hotspot: true },
            },
          ],
          preview: {
            select: { title: "label", media: "image" },
          },
        },
      ],
    }),
    defineField({
      name: "virtualTourUrl",
      title: "Virtual Tour URL",
      type: "url",
      group: "media",
      description: "Matterport, iGuide, or other virtual tour link",
    }),
    defineField({
      name: "videos",
      title: "Video Tour",
      type: "array",
      group: "media",
      description: "Add YouTube, Vimeo or direct video uploads",
      of: [
        {
          type: "object",
          name: "videoItem",
          title: "Video",
          fields: [
            {
              name: "title",
              title: "Title",
              type: "string",
              validation: (r: Rule) => r.required(),
            },
            {
              name: "videoType",
              title: "Video Type",
              type: "string",
              options: {
                list: [
                  { title: "YouTube", value: "YouTube" },
                  { title: "Vimeo", value: "Vimeo" },
                  { title: "Upload", value: "Upload" },
                ],
              },
              validation: (r: Rule) => r.required(),
            },
            {
              name: "videoUrl",
              title: "Video URL",
              type: "url",
              description: "YouTube or Vimeo link",
              hidden: ({ parent }: { parent?: { videoType?: string } }) =>
                parent?.videoType !== "YouTube" && parent?.videoType !== "Vimeo",
            },
            {
              name: "videoFile",
              title: "Video File",
              type: "file",
              options: { accept: "video/mp4,video/webm" },
              description: "Direct upload for self-hosted video",
              hidden: ({ parent }: { parent?: { videoType?: string } }) =>
                parent?.videoType !== "Upload",
            },
            {
              name: "thumbnail",
              title: "Thumbnail",
              type: "image",
              options: { hotspot: true },
              description: "Custom thumbnail — auto-generated from YouTube/Vimeo if left blank",
              hidden: ({ parent }: { parent?: { videoType?: string } }) =>
                parent?.videoType === "Upload",
            },
          ],
        },
      ],
    }),

    // ── References ──
    defineField({
      name: "branch",
      title: "Branch / Office",
      type: "reference",
      to: [{ type: "branch" }],
    }),
    defineField({
      name: "agent",
      title: "Listing Agent",
      type: "reference",
      to: [{ type: "agent" }],
      description: "The agent responsible for this listing",
    }),

    // ── SEO ──
    defineField({
      name: "metaTitle",
      title: "Meta Title",
      type: "string",
      group: "seo",
      description: "Overrides auto-generated title tag",
    }),
    defineField({
      name: "metaDescription",
      title: "Meta Description",
      type: "text",
      group: "seo",
      rows: 3,
      validation: (r) => r.max(160),
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "status",
      media: "images.0",
      price: "price",
      beds: "bedrooms",
    },
    prepare({ title, subtitle, media, price, beds }) {
      const formattedPrice = price ? `£${price.toLocaleString("en-GB")}` : "POA";
      return {
        title,
        subtitle: `${subtitle} · ${formattedPrice} · ${beds ?? "?"} bed`,
        media,
      };
    },
  },
  orderings: [
    { title: "Price (High–Low)", name: "priceDesc", by: [{ field: "price", direction: "desc" }] },
    { title: "Price (Low–High)", name: "priceAsc", by: [{ field: "price", direction: "asc" }] },
    { title: "Newest First", name: "newest", by: [{ field: "_createdAt", direction: "desc" }] },
  ],
});
