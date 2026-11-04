/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

// Base path: "/" locally/Netlify; GitHub Pages sets BASE_PATH="/<repo>/" in the deploy workflow.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@art": fileURLToPath(new URL("./art", import.meta.url)),
    },
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "Spa của Trúc",
        short_name: "Spa của Trúc",
        lang: "vi",
        display: "standalone",
        orientation: "portrait",
        start_url: base,
        scope: base,
        background_color: "#fbf6f0",
        theme_color: "#8fb39a",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json,webmanifest}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
