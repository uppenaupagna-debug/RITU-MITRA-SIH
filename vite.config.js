import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // 🔑 ensures SW updates correctly
      registerType: "autoUpdate",

      // 🔑 build-time precaching (needed for Vite hashed assets)
      strategies: "generateSW",

      // 🔑 ensure SW controls whole app
      scope: "/",
      base: "/",

      // 🔑 include static assets
      includeAssets: [
        "favicon.ico",
        "icons/icon-192.png",
        "icons/icon-512.png",
      ],

      // 🔑 CRITICAL WORKBOX CONFIG
      workbox: {
        // Allow large React bundle to be cached
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        // SPA fallback for React Router
        navigateFallback: "/index.html",

        // 🚨 ABSOLUTELY REQUIRED
        // Prevent serving index.html for JS/CSS/assets
        navigateFallbackDenylist: [
          /^\/assets\//,        // Vite hashed files
          /^\/registerSW\.js$/, // PWA helper
          /\.js$/,              // JS modules
          /\.css$/,             // CSS
          /\.json$/,            // manifest
          /\.png$/,
          /\.svg$/,
          /\.ico$/,
        ],
      },

      // 🔑 Web App Manifest
      manifest: {
        name: "Raitu Mitra",
        short_name: "RaituMitra",
        description: "Offline-first farming assistant for Indian farmers",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#16a34a",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],

  build: {
    chunkSizeWarningLimit: 2000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});