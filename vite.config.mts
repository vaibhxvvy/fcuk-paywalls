import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { createHtmlPlugin } from "vite-plugin-html";
import { websiteSchema } from "./src/data/schema.js";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    createHtmlPlugin({
      inject: {
        data: {
          jsonLd: JSON.stringify(websiteSchema),
        },
      },
    }),
  ],
});
