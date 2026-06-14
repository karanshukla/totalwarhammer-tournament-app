/**
 * Smoke test for core/config/apiConfig.ts:
 * apiConfig is a static config object with no conditional branches.
 * Tests verify it exports the expected shape and endpoint paths.
 */
import { describe, it, expect } from "vitest";
import { apiConfig } from "@/core/config/apiConfig";

describe("apiConfig", () => {
  it("has a baseUrl property (falls back to empty string when VITE_API_URL is unset)", () => {
    expect(typeof apiConfig.baseUrl).toBe("string");
  });

  it("has expected endpoint paths", () => {
    expect(apiConfig.endpoints.login).toBe("/auth/login");
    expect(apiConfig.endpoints.logout).toBe("/auth/logout");
    expect(apiConfig.endpoints.register).toBe("/user/register");
    expect(apiConfig.endpoints.token).toBe("/auth/token");
    expect(apiConfig.endpoints.userStats).toBe("/user/stats");
    expect(apiConfig.endpoints.deleteAccount).toBe("/user/account");
  });
});
