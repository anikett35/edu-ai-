// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 3000,
    open: true,

    proxy: {
      // Auth
      "/auth":      { target: "http://127.0.0.1:8000", changeOrigin: true },
      // Quiz
      "/quiz":      { target: "http://127.0.0.1:8000", changeOrigin: true },
      // Analytics & ML
      "/analytics": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/ml":        { target: "http://127.0.0.1:8000", changeOrigin: true },
      // Health check
      "/health":    { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/subjects":  { target: "http://127.0.0.1:8000", changeOrigin: true },
      // Teacher routes (upload, materials, summarize) — safe, no page route named /teacher
      "/teacher":   { target: "http://127.0.0.1:8000", changeOrigin: true },
      // Tutor API sub-paths only (avoids intercepting the /tutor React page)
      "/tutor/ask":     { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/tutor/history": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          http:   ["axios"],
        },
      },
    },
  },

  preview: {
    port: 4173,
  },
});