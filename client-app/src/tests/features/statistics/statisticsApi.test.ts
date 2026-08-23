/**
 * Coverage for features/statistics/api/statisticsApi.ts:
 * statsUrl:
 *   - no params → bare endpoint, no trailing "?"
 *   - each param appears only when supplied
 *   - offset=0 survives, which a truthiness check would drop
 *   - full query is built in a stable order
 * fetchStats:
 *   - unwraps res.data
 *   - forwards the query to httpClient
 *   - propagates a rejection rather than swallowing it
 *
 * The URL builder is the whole contract between this client and the server's
 * query validation: a dropped or misnamed param silently returns the wrong
 * window instead of failing loudly, so every branch is pinned here.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: mockGet },
}));

import {
  statsUrl,
  fetchStats,
  MAX_LIST_LIMIT,
} from "@/features/statistics/api/statisticsApi";

describe("statsUrl", () => {
  it("returns the bare endpoint when nothing is supplied", () => {
    expect(statsUrl()).toBe("/stats");
    expect(statsUrl({})).toBe("/stats");
  });

  it("includes only the params that were supplied", () => {
    expect(statsUrl({ range: "7d" })).toBe("/stats?range=7d");
    expect(statsUrl({ limit: 10 })).toBe("/stats?limit=10");
    expect(statsUrl({ offset: 30 })).toBe("/stats?offset=30");
  });

  it("keeps offset=0, which a truthiness check would drop", () => {
    expect(statsUrl({ offset: 0 })).toBe("/stats?offset=0");
  });

  it("keeps limit=0 rather than silently omitting it", () => {
    // The server rejects limit=0 with a 400. Omitting it here would turn a
    // loud validation error into a silent fallback to the default page size.
    expect(statsUrl({ limit: 0 })).toBe("/stats?limit=0");
  });

  it("builds the full query in a stable order", () => {
    expect(statsUrl({ range: "90d", limit: 25, offset: 50 })).toBe(
      "/stats?range=90d&limit=25&offset=50",
    );
  });

  it("asks for the server's maximum when exporting", () => {
    expect(statsUrl({ range: "all", limit: MAX_LIST_LIMIT })).toBe(
      "/stats?range=all&limit=200",
    );
  });
});

describe("fetchStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unwraps the data envelope", async () => {
    const data = { cachedAt: "2026-08-01T00:00:00.000Z", range: "all" };
    mockGet.mockResolvedValueOnce({ success: true, data });

    await expect(fetchStats()).resolves.toBe(data);
    expect(mockGet).toHaveBeenCalledWith("/stats");
  });

  it("forwards the query to httpClient", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: {} });

    await fetchStats({ range: "30d", limit: 5, offset: 5 });

    expect(mockGet).toHaveBeenCalledWith("/stats?range=30d&limit=5&offset=5");
  });

  it("propagates a request failure to the caller", async () => {
    // The page turns this into its error state, so swallowing it here would
    // leave the UI stuck on a spinner.
    mockGet.mockRejectedValueOnce(new Error("Network failure"));

    await expect(fetchStats()).rejects.toThrow("Network failure");
  });
});
