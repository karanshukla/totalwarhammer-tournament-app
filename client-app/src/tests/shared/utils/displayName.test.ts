/**
 * Branch coverage for shared/utils/displayName.ts:
 * - !name (null / undefined / "") → "Unknown"
 * - DELETED_PATTERN.test(name.trim()) → "Deleted User"
 * - else → name as-is
 */
import { describe, it, expect } from "vitest";
import { displayName } from "@/shared/utils/displayName";

describe("displayName – null / undefined / empty → 'Unknown'", () => {
  it("returns 'Unknown' for null", () => {
    expect(displayName(null)).toBe("Unknown");
  });

  it("returns 'Unknown' for undefined", () => {
    expect(displayName(undefined)).toBe("Unknown");
  });

  it("returns 'Unknown' for empty string", () => {
    expect(displayName("")).toBe("Unknown");
  });
});

describe("displayName – deleted_ pattern → 'Deleted User'", () => {
  it("matches lowercase deleted_ prefix with 8 hex chars", () => {
    expect(displayName("deleted_12345678")).toBe("Deleted User");
  });

  it("matches uppercase DELETED_ prefix (case-insensitive)", () => {
    expect(displayName("DELETED_abcdef01")).toBe("Deleted User");
  });

  it("matches mixed hex characters after deleted_", () => {
    expect(displayName("deleted_aAbBcCdD")).toBe("Deleted User");
  });

  it("trims whitespace before testing", () => {
    expect(displayName("  deleted_12345678  ")).toBe("Deleted User");
  });

  it("does NOT match if hex part is not exactly 8 chars", () => {
    expect(displayName("deleted_1234567")).toBe("deleted_1234567");
    expect(displayName("deleted_123456789")).toBe("deleted_123456789");
  });

  it("does NOT match if not at start of string", () => {
    expect(displayName("xdeleted_12345678")).toBe("xdeleted_12345678");
  });
});

describe("displayName – regular names returned as-is", () => {
  it("returns regular name unchanged", () => {
    expect(displayName("Grimgork")).toBe("Grimgork");
  });

  it("returns name with spaces unchanged", () => {
    expect(displayName("Player One")).toBe("Player One");
  });

  it("returns name that starts with 'deleted' but does not match full pattern", () => {
    expect(displayName("deleted_user")).toBe("deleted_user");
  });
});
