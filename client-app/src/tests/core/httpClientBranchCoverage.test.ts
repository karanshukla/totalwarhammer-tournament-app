/**
 * Branch coverage for httpClient.ts:
 * - Line 149: POST `if (token && !skipCsrf)` false branch — CSRF fetch fails
 * - Line 296: PATCH `if (token && !skipCsrf)` true/false branches
 * - Line 318: PATCH retry `body: data ? ... : undefined` — no body case
 * - Line 367: DELETE 403 with non-CSRF error message (false branch of CSRF check)
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { httpClient } from "@/core/api/httpClient";
import { apiConfig } from "@/core/config/apiConfig";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const baseUrl = apiConfig.baseUrl || "http://localhost:3000";

describe("httpClient – branch coverage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    httpClient.resetCsrfToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST – CSRF token fetch fails (line 149 false branch)", () => {
    it("proceeds with POST without CSRF header when token fetch fails", async () => {
      // CSRF token fetch fails (not ok)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      // Actual POST request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
        headers: new Headers({ "content-length": "15" }),
      });

      const result = await httpClient.post("/some-endpoint", { data: "test" });

      expect(result).toEqual({ success: true });
      // The request should NOT have X-CSRF-Token since token fetch failed
      const postCall = mockFetch.mock.calls[1];
      expect(postCall[1].headers).not.toHaveProperty("X-CSRF-Token");
    });
  });

  describe("PATCH method (lines 296, 318)", () => {
    it("makes PATCH request with CSRF token (line 296 true branch)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "patch-token" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
        headers: new Headers({ "content-length": "15" }),
      });

      const result = await httpClient.patch("/resource/1", {
        name: "New Name",
      });

      expect(result).toEqual({ updated: true });
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${baseUrl}/resource/1`,
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({ "X-CSRF-Token": "patch-token" }),
          body: JSON.stringify({ name: "New Name" }),
        }),
      );
    });

    it("makes PATCH request without body when data is undefined (line 296 body branch)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "patch-token" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
        headers: new Headers({ "content-length": "15" }),
      });

      await httpClient.patch("/resource/1");

      // body should be undefined when no data passed
      expect(mockFetch.mock.calls[1][1].body).toBeUndefined();
    });

    it("skips CSRF header on PATCH when skipCsrf is true (line 287 false branch)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
        headers: new Headers({ "content-length": "15" }),
      });

      await httpClient.patch("/resource/1", { x: 1 }, { skipCsrf: true });

      // Only one fetch call (no CSRF token fetch)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1].headers).not.toHaveProperty(
        "X-CSRF-Token",
      );
    });

    it("retries PATCH with new CSRF token on 403 CSRF error (line 318)", async () => {
      // First CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "old-token" }),
        status: 200,
      });
      // Initial PATCH fails with 403 CSRF error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "CSRF validation failed" }),
      });
      // Second CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "new-token" }),
        status: 200,
      });
      // Retry PATCH succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
        headers: new Headers({ "content-length": "15" }),
      });

      const result = await httpClient.patch("/resource/1", { field: "value" });

      expect(result).toEqual({ updated: true });
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(mockFetch.mock.calls[3][1].headers["X-CSRF-Token"]).toBe(
        "new-token",
      );
    });

    it("PATCH retry with undefined data sends no body (line 318 false branch)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "old-token" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "CSRF validation failed" }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "new-token" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers({ "content-length": "2" }),
      });

      // No data argument → body should be undefined in retry
      await httpClient.patch("/resource/1");

      // The retry request at index 3 should have undefined body
      expect(mockFetch.mock.calls[3][1].body).toBeUndefined();
    });
  });

  describe("DELETE – 403 with non-CSRF error (line 367 false branch)", () => {
    it("does not retry when 403 error is not CSRF-related", async () => {
      // CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "del-token" }),
        status: 200,
      });
      // DELETE returns 403 but with a different error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: "Permission denied",
          message: "Not authorized",
        }),
      });

      // The error should be swallowed by the catch (no retry), then handleResponse called
      // which will reject since the response is not ok
      await expect(httpClient.delete("/protected-resource")).rejects.toThrow();

      // Only 2 fetches (CSRF + DELETE, no retry)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("retries DELETE with new CSRF token when 403 is CSRF-related", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "old-del-token" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "CSRF validation failed" }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "new-del-token" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ deleted: true }),
        headers: new Headers({ "content-length": "15" }),
      });

      const result = await httpClient.delete("/resource/1");

      expect(result).toEqual({ deleted: true });
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });
});
