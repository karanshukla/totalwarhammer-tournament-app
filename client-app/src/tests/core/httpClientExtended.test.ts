import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { httpClient } from "../../core/api/httpClient";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("HttpClient - Extended Coverage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    httpClient.resetCsrfToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkSessionStatus", () => {
    it("should return valid true and sessionId when response is ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "tok", sessionId: "sess-123" }),
        status: 200,
      });

      const result = await httpClient.checkSessionStatus();
      expect(result).toEqual({ valid: true, sessionId: "sess-123" });
    });

    it("should update csrfToken as a side effect", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "fresh-token", sessionId: "s1" }),
        status: 200,
      });

      await httpClient.checkSessionStatus();

      // After checkSessionStatus, subsequent POST should reuse the token without fetching
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      await httpClient.post("/some-endpoint", {});
      // Only 2 calls total (checkSessionStatus + POST), no extra CSRF fetch
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should return valid false and null sessionId when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({}),
      });

      const result = await httpClient.checkSessionStatus();
      expect(result).toEqual({ valid: false, sessionId: null });
    });

    it("should return valid false when fetch throws (network error)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await httpClient.checkSessionStatus();
      expect(result).toEqual({ valid: false, sessionId: null });
    });

    it("should not update csrfToken when response has no csrfToken", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: "s1" }),
        status: 200,
      });

      await httpClient.checkSessionStatus();

      // Token not set, so POST should fetch a new CSRF token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "new-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      await httpClient.post("/ep", {});
      // 3 calls: checkSessionStatus + csrf fetch + POST
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("ensureCsrfToken", () => {
    it("should return cached token on second call", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "my-tok" }),
        status: 200,
      });

      const t1 = await httpClient.ensureCsrfToken();
      const t2 = await httpClient.ensureCsrfToken();
      expect(t1).toBe("my-tok");
      expect(t2).toBe("my-tok");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should return null when server response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      const token = await httpClient.ensureCsrfToken();
      expect(token).toBeNull();
    });

    it("should return null when server returns no csrfToken field", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ someOtherField: "value" }),
        status: 200,
      });

      const token = await httpClient.ensureCsrfToken();
      expect(token).toBeNull();
    });

    it("should return null when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const token = await httpClient.ensureCsrfToken();
      expect(token).toBeNull();
    });

    it("should deduplicate concurrent token requests", async () => {
      let resolveFirst!: (v: Response) => void;
      const firstFetch = new Promise<Response>((res) => {
        resolveFirst = res;
      });
      mockFetch.mockReturnValueOnce(firstFetch);

      const p1 = httpClient.ensureCsrfToken();
      const p2 = httpClient.ensureCsrfToken();

      resolveFirst({
        ok: true,
        json: async () => ({ csrfToken: "shared-tok" }),
        status: 200,
      } as Response);

      const [t1, t2] = await Promise.all([p1, p2]);
      expect(t1).toBe("shared-tok");
      expect(t2).toBe("shared-tok");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("PATCH method", () => {
    it("should make a PATCH request with CSRF token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "patch-token" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      const result = await httpClient.patch("/some/resource", { field: "val" });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][1]).toMatchObject({
        method: "PATCH",
        credentials: "include",
        headers: expect.objectContaining({ "X-CSRF-Token": "patch-token" }),
        body: JSON.stringify({ field: "val" }),
      });
      expect(result).toEqual({ updated: true });
    });

    it("should skip CSRF when skipCsrf is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ done: true }),
        status: 200,
        headers: new Headers({ "content-length": "12" }),
      });

      await httpClient.patch("/ep", { a: 1 }, { skipCsrf: true });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1].headers).not.toHaveProperty(
        "X-CSRF-Token",
      );
    });

    it("should warn when CSRF token is null and not skipped", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => ({}),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ done: true }),
        status: 200,
        headers: new Headers({ "content-length": "12" }),
      });

      await httpClient.patch("/ep", { a: 1 });
      expect(warnSpy).toHaveBeenCalledWith(
        "Could not fetch CSRF token for PATCH request",
      );
      warnSpy.mockRestore();
    });

    it("should retry with new CSRF token on 403 CSRF validation failed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "old-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "CSRF validation failed" }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "new-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
        status: 200,
        headers: new Headers({ "content-length": "10" }),
      });

      const result = await httpClient.patch("/ep", {});
      expect(result).toEqual({ ok: true });
      expect(mockFetch.mock.calls[3][1].headers["X-CSRF-Token"]).toBe(
        "new-tok",
      );
    });

    it("should throw an error when CSRF token refresh fails on retry", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: "CSRF validation failed",
          message: "Token invalid",
        }),
      });
      // Token refresh fails - ensureCsrfToken returns null
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => ({}),
      });

      // The internal throw is caught, then handleResponse re-throws the 403 error
      await expect(httpClient.patch("/ep", {})).rejects.toThrow(
        "Token invalid",
      );
    });

    it("should handle 403 non-CSRF error and return response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Forbidden: access denied" }),
      });

      await expect(httpClient.patch("/ep", {})).rejects.toThrow(
        "Forbidden: access denied",
      );
    });
  });

  describe("PUT method - CSRF retry paths", () => {
    it("should retry with new CSRF token on 403 CSRF validation failed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "old-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "CSRF validation failed" }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "new-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ saved: true }),
        status: 200,
        headers: new Headers({ "content-length": "13" }),
      });

      const result = await httpClient.put("/resource/1", { x: 1 });
      expect(result).toEqual({ saved: true });
      expect(mockFetch.mock.calls[3][1].headers["X-CSRF-Token"]).toBe(
        "new-tok",
      );
    });

    it("should throw an error when token refresh fails during PUT retry", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: "CSRF validation failed",
          message: "Token expired",
        }),
      });
      // Token refresh fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => ({}),
      });

      // The internal throw is caught, then handleResponse re-throws the 403 error
      await expect(httpClient.put("/resource/1", {})).rejects.toThrow(
        "Token expired",
      );
    });

    it("should warn when CSRF token is null for PUT", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        status: 200,
        headers: new Headers({ "content-length": "2" }),
      });

      await httpClient.put("/ep", {});
      expect(warnSpy).toHaveBeenCalledWith(
        "Could not fetch CSRF token for PUT request",
      );
      warnSpy.mockRestore();
    });

    it("should skip CSRF for PUT when skipCsrf is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ done: true }),
        status: 200,
        headers: new Headers({ "content-length": "12" }),
      });

      await httpClient.put("/ep", {}, { skipCsrf: true });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("DELETE method - CSRF retry paths", () => {
    it("should retry with new CSRF token on 403 CSRF validation failed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "old-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "CSRF validation failed" }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "new-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ "content-length": "0" }),
        json: async () => ({}),
      });

      const result = await httpClient.delete("/resource/1");
      expect(result).toEqual({});
    });

    it("should throw an error when token refresh fails during DELETE retry", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: "CSRF validation failed",
          message: "CSRF expired",
        }),
      });
      // Token refresh fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => ({}),
      });

      // The internal throw is caught, then handleResponse re-throws the 403 error
      await expect(httpClient.delete("/resource/1")).rejects.toThrow(
        "CSRF expired",
      );
    });

    it("should warn when CSRF token is null for DELETE", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ "content-length": "0" }),
        json: async () => ({}),
      });

      await httpClient.delete("/ep");
      expect(warnSpy).toHaveBeenCalledWith(
        "Could not fetch CSRF token for DELETE request",
      );
      warnSpy.mockRestore();
    });

    it("should skip CSRF for DELETE when skipCsrf is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ "content-length": "0" }),
        json: async () => ({}),
      });

      await httpClient.delete("/ep", { skipCsrf: true });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST method - additional paths", () => {
    it("should throw an error when CSRF token refresh fails during POST retry", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: "CSRF validation failed",
          message: "Session invalid",
        }),
      });
      // Token refresh fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => ({}),
      });

      // The internal throw is caught, then handleResponse re-throws the 403 error
      await expect(httpClient.post("/some-endpoint", {})).rejects.toThrow(
        "Session invalid",
      );
    });

    it("should warn when CSRF token is null for POST", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      await httpClient.post("/ep", {});
      expect(warnSpy).toHaveBeenCalledWith(
        "Could not fetch CSRF token for POST request",
      );
      warnSpy.mockRestore();
    });

    it("should include CSRF for /guest endpoints even when other auth endpoints skip it", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "guest-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "guest-123" }),
        status: 200,
        headers: new Headers({ "content-length": "20" }),
      });

      await httpClient.post("/guest/create", {});
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][1].headers["X-CSRF-Token"]).toBe(
        "guest-tok",
      );
    });

    it("should skip CSRF for /auth/token endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "jwt" }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      await httpClient.post("/auth/token", {});
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should skip CSRF for /auth/logout endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      await httpClient.post("/auth/logout", {});
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle 403 non-CSRF error gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Access denied" }),
      });

      await expect(httpClient.post("/restricted", {})).rejects.toThrow(
        "Access denied",
      );
    });
  });

  describe("handleResponse edge cases", () => {
    it("should set csrfToken to null when 403 CSRF error occurs in handleResponse", async () => {
      // First get a token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "initial-tok" }),
        status: 200,
      });
      // POST succeeds with token set
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "ok" }),
        status: 200,
        headers: new Headers({ "content-length": "10" }),
      });
      await httpClient.post("/ep", {});

      // Now a GET that returns 403 CSRF error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: "CSRF validation failed",
          message: "Token invalid",
        }),
      });

      await expect(httpClient.get("/protected")).rejects.toThrow(
        "Token invalid",
      );

      // Token should be reset - next POST should fetch new CSRF token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "fresh-tok" }),
        status: 200,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
        status: 200,
        headers: new Headers({ "content-length": "10" }),
      });
      await httpClient.post("/ep2", {});
      // Should have fetched fresh CSRF token
      const calls = mockFetch.mock.calls;
      expect(calls[calls.length - 2][0]).toContain("/auth/csrf-token");
    });

    it("should throw original error message when JSON parsing fails in error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("JSON parse error");
        },
      });

      await expect(httpClient.get("/ep")).rejects.toThrow(
        "Error 500: Internal Server Error",
      );
    });

    it("should return empty object for 204 No Content response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: "No Content",
        headers: new Headers(),
        json: async () => ({}),
      });

      const result = await httpClient.get("/ep");
      expect(result).toEqual({});
    });

    it("should return empty object when content-length is 0", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-length": "0" }),
        json: async () => ({}),
      });

      const result = await httpClient.get("/ep");
      expect(result).toEqual({});
    });

    it("should use statusText when message is missing from error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: "resource_missing" }),
      });

      await expect(httpClient.get("/missing")).rejects.toThrow(
        "Error 404: Not Found",
      );
    });
  });

  describe("GET method - URL building with params", () => {
    it("should append multiple params to URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        status: 200,
        headers: new Headers({ "content-length": "2" }),
      });

      await httpClient.get("/search", {
        params: { q: "warhammer", page: "2", limit: "20" },
      });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get("q")).toBe("warhammer");
      expect(calledUrl.searchParams.get("page")).toBe("2");
      expect(calledUrl.searchParams.get("limit")).toBe("20");
    });
  });
});
