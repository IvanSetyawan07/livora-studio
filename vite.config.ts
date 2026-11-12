import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/__l5e/assets-v1": {
        target: "https://fd9eb25d-25c2-4958-a392-093e19fb7149.lovableproject.com",
        changeOrigin: true,
        secure: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  preview: {
    proxy: {
      "/__l5e/assets-v1": {
        target: "https://fd9eb25d-25c2-4958-a392-093e19fb7149.lovableproject.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    modulePreload: {
      // Jangan preload bundle berat admin/PDF/chart/3D di halaman landing page.
      resolveDependencies: (_filename, deps) =>
        deps.filter((d) => !/(vendor-pdf|vendor-charts|vendor-three|html5-qrcode|ERD|Admin)/i.test(d)),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
          if (id.includes("@react-pdf")) return "vendor-pdf";
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return "vendor-three";
          if (id.includes("gsap") || id.includes("lenis")) return "vendor-gsap";
          if (id.includes("framer-motion")) return "vendor-motion";
        },
      },
    },
  },
}));
