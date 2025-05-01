import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    chunkSizeWarningLimit: 800, // Increased warning limit (in kB)
    rollupOptions: {
      output: {
        manualChunks: {
          // Group React dependencies
          "vendor-react": ["react", "react-dom"],
          // Group Chakra UI dependencies
          "vendor-chakra": ["@chakra-ui/react", "@emotion/react"],
          // Group form-related dependencies
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          // Group utilities
          "vendor-utils": ["zustand", "next-themes", "react-icons"],
        },
      },
    },
  },
});
