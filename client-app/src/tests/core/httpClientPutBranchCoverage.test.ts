/**
 * Branch coverage for httpClient.ts PUT method and POST retry:
 * - Line 180: POST retry `body: data ? ... : undefined` — no-body (data=undefined) false branch
 * - Line 227: PUT `body: data ? ... : undefined` — no-body false branch
 * - Line 234: PUT `if (errorData.error === "CSRF validation failed")` — false branch (different error)
 * - Line 249: PUT retry `body: data ? ... : undefined` — no-body false branch
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { httpClient } from "@/core/api/httpClient";
import { apiConfig } from "@/core/config/apiConfig";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const baseUrl = apiConfig.baseUrl || "http://localhost:3000";

describe("httpClient – PUT / POST retry branch coverage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    httpClient.resetCsrfToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST retry with undefined data (line 180 false branch)", () => {
    it("retries POST without body when data is undefined", async () => {
      // CSRF token fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "tok-1" }),
        status: 200,
      });
      // POST fails with 403 CSRF error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "CSRF validation failed" }),
      });
      // CSRF token refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "tok-2" }),
        status: 200,
      });
      // Retry POST succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ created: true }),
        headers: new Headers({ "content-length": "15" }),
      });

      // Call post with NO data argument → data is undefined → false branch of `data ?`
      const result = await httpClient.post("/no-body-endpoint");

      expect(result).toEqual({ created: true });
      expect(mockFetch).toHaveBeenCalledTimes(4);
      // Retry call (index 3) should have undefined body
      expect(mockFetch.mock.calls[3][1].body).toBeUndefined();
    });
  });

  describe("PUT – no-body (line 227 false branch)", () => {
    it("sends PUT request with undefined body when data is omitted", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "put-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
        headers: new Headers({ "content-length": "15" }),
      });

      const result = await httpClient.put("/resource/1");

      expect(result).toEqual({ updated: true });
      // body should be undefined when no data is passed
      expect(mockFetch.mock.calls[1][1].body).toBeUndefined();
    });
  });

  describe("PUT – 403 non-CSRF error (line 234 false branch)", () => {
    it("does not retry PUT when 403 error is not CSRF-related", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "put-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "Unauthorized", message: "Access denied" }),
      });

      // Should throw from handleResponse (no retry)
      await expect(httpClient.put("/protected", { x: 1 })).rejects.toThrow();

      // Only 2 calls: CSRF fetch + PUT request (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("PUT – retry with undefined data (line 249 false branch)", () => {
    it("retries PUT without body when data is undefined and CSRF fails", async () => {
      // CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "old-put-tok" }),
        status: 200,
      });
      // PUT fails with 403 CSRF error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "CSRF validation failed" }),
      });
      // CSRF token refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "new-put-tok" }),
        status: 200,
      });
      // Retry PUT succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers({ "content-length": "2" }),
      });

      // No data argument → body should be undefined in retry
      await httpClient.put("/resource/1");

      expect(mockFetch).toHaveBeenCalledTimes(4);
      // Retry request (index 3) should have undefined body
      expect(mockFetch.mock.calls[3][1].body).toBeUndefined();
    });
  });

  describe("PUT – with CSRF token (happy path verification)", () => {
    it("makes PUT request with CSRF token and body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "happy-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ saved: true }),
        headers: new Headers({ "content-length": "12" }),
      });

      const result = await httpClient.put("/resource/1", { name: "Updated" });

      expect(result).toEqual({ saved: true });
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${baseUrl}/resource/1`,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({ "X-CSRF-Token": "happy-tok" }),
          body: JSON.stringify({ name: "Updated" }),
        }),
      );
    });
  });
});
