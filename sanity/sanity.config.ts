import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemas";

const singletons = ["siteSettings"];

export default defineConfig({
  name: "default",
  title: "Real Estate Scaffold",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID || process.env.SANITY_PROJECT_ID || "itpavex8",
  dataset: process.env.SANITY_STUDIO_DATASET || process.env.SANITY_DATASET || "production",

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Content")
          .items([
            S.listItem()
              .title("Site Settings")
              .child(S.document().schemaType("siteSettings").documentId("site-settings")),
            S.divider(),
            ...S.documentTypeListItems().filter((item) => !singletons.includes(item.getId())),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
});
