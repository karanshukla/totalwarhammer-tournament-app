import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { httpClient } from "../../core/api/httpClient";
import { apiConfig } from "../../core/config/apiConfig";

// Setup mock for fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("HttpClient", () => {
  const baseUrl = apiConfig.baseUrl;

  beforeEach(() => {
    // Reset mocks before each test
    mockFetch.mockReset();
    httpClient.resetCsrfToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET method", () => {
    it("should make a GET request with correct URL and headers", async () => {
      // Setup mock response
      const mockResponse = { data: "test data" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-length": "20" }),
      });

      // Perform request
      const result = await httpClient.get("/test-endpoint");

      // Verify fetch was called with correct arguments
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/test-endpoint`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Verify result
      expect(result).toEqual(mockResponse);
    });

    it("should add query parameters to URL when provided", async () => {
      // Setup mock response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-length": "2" }),
      });

      // Perform request with params
      await httpClient.get("/test-endpoint", {
        params: { page: "1", limit: "10" },
      });

      // Verify URL includes query params
      const expectedUrl = `${baseUrl}/test-endpoint?page=1&limit=10`;
      expect(mockFetch.mock.calls[0][0]).toBe(expectedUrl);
    });

    it("should handle error responses from API", async () => {
      const errorMessage = "Not found";
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: errorMessage }),
      });

      await expect(httpClient.get("/test-endpoint")).rejects.toThrow(
        errorMessage
      );
    });

    it("should handle empty responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204, // No content
        statusText: "No Content",
        headers: new Headers({ "content-length": "0" }),
        json: vi.fn().mockRejectedValue(new Error("No content")),
      });

      const result = await httpClient.get("/empty-endpoint");
      expect(result).toEqual({});
    });
  });

  describe("POST method", () => {
    it("should make a POST request with correct body and headers", async () => {
      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "test-token" }),
        status: 200,
      });

      // Mock actual request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      const requestData = { name: "Test" };

      const result = await httpClient.post("/test-endpoint", requestData);

      // Verify csrf token was fetched
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `${baseUrl}/auth/csrf-token`,
        expect.objectContaining({
          method: "GET",
          credentials: "include",
          cache: "no-cache",
        })
      );

      // Verify POST request was made with correct data and CSRF token
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${baseUrl}/test-endpoint`,
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-CSRF-Token": "test-token",
          }),
          body: JSON.stringify(requestData),
        })
      );

      expect(result).toEqual({ success: true });
    });

    it("should skip CSRF token for authentication endpoints", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      const loginData = { username: "test", password: "password" };

      await httpClient.post("/auth/login", loginData);

      // Verify no CSRF token was fetched
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify POST request was made without CSRF token
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/auth/login`,
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(loginData),
        })
      );

      expect(mockFetch.mock.calls[0][1].headers).not.toHaveProperty(
        "X-CSRF-Token"
      );
    });

    it("should retry with new CSRF token when validation fails", async () => {
      // First CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "old-token" }),
        status: 200,
      });

      // Failed POST with CSRF error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: "CSRF validation failed",
          message: "Invalid token",
        }),
      });

      // Second CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "new-token" }),
        status: 200,
      });

      // Successful retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      const result = await httpClient.post("/test-endpoint", { data: "test" });

      expect(mockFetch).toHaveBeenCalledTimes(4);

      // Verify last call used new token
      expect(mockFetch.mock.calls[3][1].headers["X-CSRF-Token"]).toBe(
        "new-token"
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe("PUT method", () => {
    it("should make a PUT request with correct body and headers", async () => {
      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "test-token" }),
        status: 200,
      });

      // Mock actual request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      const requestData = { id: 1, name: "Updated" };

      const result = await httpClient.put("/test-endpoint/1", requestData);

      // Verify csrf token was fetched
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `${baseUrl}/auth/csrf-token`,
        expect.anything()
      );

      // Verify PUT request was made with correct data and CSRF token
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${baseUrl}/test-endpoint/1`,
        expect.objectContaining({
          method: "PUT",
          credentials: "include",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-CSRF-Token": "test-token",
          }),
          body: JSON.stringify(requestData),
        })
      );

      expect(result).toEqual({ success: true });
    });
  });

  describe("DELETE method", () => {
    it("should make a DELETE request with correct headers", async () => {
      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "test-token" }),
        status: 200,
      });

      // Mock actual request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      const result = await httpClient.delete("/test-endpoint/1");

      // Verify csrf token was fetched
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `${baseUrl}/auth/csrf-token`,
        expect.anything()
      );

      // Verify DELETE request was made with correct CSRF token
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${baseUrl}/test-endpoint/1`,
        expect.objectContaining({
          method: "DELETE",
          credentials: "include",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-CSRF-Token": "test-token",
          }),
        })
      );

      expect(result).toEqual({ success: true });
    });
  });

  describe("CSRF token management", () => {
    it("should cache CSRF token between requests", async () => {
      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "test-token" }),
        status: 200,
      });

      // Mock first request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      // Mock second request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers({ "content-length": "15" }),
      });

      // First request should fetch token
      await httpClient.post("/test-endpoint-1", { data: "test1" });

      // Second request should reuse token
      await httpClient.post("/test-endpoint-2", { data: "test2" });

      // Verify token was only fetched once
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch.mock.calls[0][0]).toBe(`${baseUrl}/auth/csrf-token`);
      expect(mockFetch.mock.calls[1][0]).toBe(`${baseUrl}/test-endpoint-1`);
      expect(mockFetch.mock.calls[2][0]).toBe(`${baseUrl}/test-endpoint-2`);
    });

    it("should reset CSRF token when explicitly called", async () => {
      // Mock first CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "first-token" }),
        status: 200,
      });

      // Mock first request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        status: 200,
        headers: new Headers({ "content-length": "2" }),
      });

      // Mock second CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "second-token" }),
        status: 200,
      });

      // Mock second request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        status: 200,
        headers: new Headers({ "content-length": "2" }),
      });

      // First request
      await httpClient.post("/test-endpoint-1");

      // Reset token
      httpClient.resetCsrfToken();

      // Second request should fetch a new token
      await httpClient.post("/test-endpoint-2");

      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(mockFetch.mock.calls[0][0]).toBe(`${baseUrl}/auth/csrf-token`);
      expect(mockFetch.mock.calls[1][0]).toBe(`${baseUrl}/test-endpoint-1`);
      expect(mockFetch.mock.calls[2][0]).toBe(`${baseUrl}/auth/csrf-token`);
      expect(mockFetch.mock.calls[3][0]).toBe(`${baseUrl}/test-endpoint-2`);
    });
  });
});
