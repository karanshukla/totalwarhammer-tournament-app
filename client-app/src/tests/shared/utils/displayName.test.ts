/**
 * Full branch coverage for displayName utility (src/shared/utils/displayName.ts):
 * - Line 4: `!name` → returns "Unknown"
 * - Line 5: DELETED_PATTERN matches → returns "Deleted User"
 * - Line 6: normal name → returns name as-is
 */
import { describe, it, expect } from "vitest";
import { displayName } from "@/shared/utils/displayName";

describe("displayName", () => {
  it("returns 'Unknown' when name is null", () => {
    expect(displayName(null)).toBe("Unknown");
  });

  it("returns 'Unknown' when name is undefined", () => {
    expect(displayName(undefined)).toBe("Unknown");
  });

  it("returns 'Unknown' when name is empty string", () => {
    expect(displayName("")).toBe("Unknown");
  });

  it("returns 'Deleted User' for deleted_ pattern", () => {
    expect(displayName("deleted_a1b2c3d4")).toBe("Deleted User");
  });

  it("returns 'Deleted User' for deleted_ pattern with uppercase", () => {
    expect(displayName("DELETED_A1B2C3D4")).toBe("Deleted User");
  });

  it("returns name unchanged for a normal player name", () => {
    expect(displayName("Karl Franz")).toBe("Karl Franz");
  });

  it("returns name unchanged for a guest identifier", () => {
    expect(displayName("guest_abc123")).toBe("guest_abc123");
  });
});
