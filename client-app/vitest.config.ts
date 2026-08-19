import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    globals: true,
    // Coverage instrumentation roughly doubles run time, and the heavier
    // interaction tests sit close enough to the 5s default to make failures
    // look like flakes rather than real regressions.
    testTimeout: 15000,
  },
});
