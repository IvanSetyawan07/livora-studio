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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@react-pdf")) return "vendor-pdf";
          if (id.includes("node_modules/three")) return "vendor-three";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("@xyflow")) return "vendor-flow";
          if (id.includes("gsap") || id.includes("lenis")) return "vendor-gsap";
          if (id.includes("framer-motion")) return "vendor-motion";
        },
      },
    },
  },
}));
