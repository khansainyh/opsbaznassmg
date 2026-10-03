import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./src/sanity/schemaTypes";
import { myTheme } from "./src/sanity/theme";

export default defineConfig({
  basePath: "/studio",
  projectId: "y0whspc7",
  dataset: "production",
  title: "Admin Nyah N'tin",
  theme: myTheme,
  schema: {
    types: schemaTypes,
  },
  plugins: [structureTool()],
});
