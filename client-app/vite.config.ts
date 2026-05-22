import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
  plugins: [react(), tsconfigPaths()],
  build: {
    chunkSizeWarningLimit: 800, // Increased warning limit (in kB)
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](?:react|react-dom)[\\/]/.test(id)) return "vendor-react";
          if (/[\\/]node_modules[\\/](?:@chakra-ui|@emotion)[\\/]/.test(id)) return "vendor-chakra";
          if (/[\\/]node_modules[\\/](?:react-hook-form|@hookform|zod)[\\/]/.test(id)) return "vendor-forms";
          if (/[\\/]node_modules[\\/](?:zustand|next-themes|react-icons)[\\/]/.test(id)) return "vendor-utils";
        },
      },
    },
  },
});
