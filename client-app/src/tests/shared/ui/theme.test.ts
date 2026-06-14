/**
 * Smoke test for shared/ui/theme.ts:
 * theme.ts is a declarative Chakra UI system config with no conditional branches.
 * Tests verify the exported system object is defined and has the expected shape.
 */
import { describe, it, expect } from "vitest";
import { system } from "@/shared/ui/theme";

describe("theme – system export", () => {
  it("exports a defined system object", () => {
    expect(system).toBeDefined();
  });

  it("system has token method (Chakra v3 api)", () => {
    expect(typeof system.token).toBe("function");
  });
});
