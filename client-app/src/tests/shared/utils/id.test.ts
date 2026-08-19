import { describe, it, expect } from "vitest";
import { uniqueId } from "@/shared/utils/id";

describe("uniqueId", () => {
  it("does not collide within a single synchronous burst", () => {
    const ids = Array.from({ length: 500 }, () => uniqueId("p"));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the prefix", () => {
    expect(uniqueId("m").startsWith("m")).toBe(true);
  });
});
