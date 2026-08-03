import { defineField, defineType } from "sanity";

export default defineType({
  name: "branch",
  title: "Branch / Office",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Branch Name",
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
      name: "address",
      title: "Address",
      type: "text",
      rows: 3,
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
      name: "logo",
      title: "Branch Logo",
      type: "image",
    }),
    defineField({
      name: "openingHours",
      title: "Opening Hours",
      type: "text",
      rows: 4,
      description: "e.g. Mon–Fri: 9am–6pm, Sat: 10am–4pm",
    }),
    defineField({
      name: "location",
      title: "Map Location",
      type: "geopoint",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "phone", media: "logo" },
  },
});
