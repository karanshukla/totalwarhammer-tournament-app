import { apiConfig } from "../config/apiConfig";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipCsrf?: boolean;
}

class HttpClient {
  private baseUrl: string;
  private csrfToken: string | null = null;
  private tokenPromise: Promise<string | null> | null = null;
  private debug: boolean = false; // Set to false by default

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if the current session is valid and functioning.
   * This also refreshes the CSRF token as a side-effect.
   * @returns Promise with session check result
   */
  async checkSessionStatus(): Promise<{
    valid: boolean;
    sessionId: string | null;
  }> {
    try {
      const base = this.baseUrl || window.location.origin;
      const response = await fetch(`${base}/auth/csrf-token`, {
        method: "GET",
        credentials: "include",
        cache: "no-cache",
      });

      if (!response.ok) {
        return { valid: false, sessionId: null };
      }

      const data = await response.json();

      // Update the CSRF token as it's available from this endpoint
      if (data.csrfToken) {
        this.csrfToken = data.csrfToken;
      }

      return { valid: true, sessionId: data.sessionId };
    } catch {
      // Error is intentionally not logged here as debug is false
      return { valid: false, sessionId: null };
    }
  }

  async ensureCsrfToken(): Promise<string | null> {
    if (this.csrfToken) {
      return this.csrfToken;
    }
    if (this.tokenPromise) {
      return this.tokenPromise;
    }
    this.tokenPromise = new Promise<string | null>((resolve) => {
      const base = this.baseUrl || window.location.origin;
      fetch(`${base}/auth/csrf-token`, {
        method: "GET",
        credentials: "include",
        cache: "no-cache",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to fetch CSRF token: ${response.statusText}`,
            );
          }
          return response.json();
        })
        .then((data) => {
          if (!data.csrfToken) {
            throw new Error("Server did not return a CSRF token");
          }

          this.csrfToken = data.csrfToken;

          resolve(this.csrfToken);
        })
        .catch((error) => {
          console.error("Error fetching CSRF token:", error);
          this.csrfToken = null;
          resolve(null);
        })
        .finally(() => {
          this.tokenPromise = null;
        });
    });

    return this.tokenPromise;
  }

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...requestOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...requestOptions.headers,
      },
    });

    return this.handleResponse<T>(response);
  }
  async post<T>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const shouldSkipCsrf =
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/logout") ||
      endpoint.includes("/auth/token") ||
      options.skipCsrf;

    // Always include CSRF token for guest endpoints
    const isGuestEndpoint = endpoint.includes("/guest");
    const skipCsrfForEndpoint = isGuestEndpoint ? false : shouldSkipCsrf;

    const {
      params,
      skipCsrf = skipCsrfForEndpoint,
      ...requestOptions
    } = options;

    let token = null;
    if (!skipCsrf) {
      token = await this.ensureCsrfToken();
      if (!token) {
        console.warn("Could not fetch CSRF token for POST request");
      }
    }

    const url = this.buildUrl(endpoint, params);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(requestOptions.headers as Record<string, string>),
    };

    if (token && !skipCsrf) {
      headers["X-CSRF-Token"] = token;
    }

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      ...requestOptions,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 403) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        // body unparseable — fall through to handleResponse
      }

      if (errorData !== null) {
        if (errorData.error === "CSRF validation failed") {
          this.csrfToken = null;
          token = await this.ensureCsrfToken();
          if (token) {
            const retryResponse = await fetch(url, {
              method: "POST",
              credentials: "include",
              ...requestOptions,
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": token,
                ...requestOptions.headers,
              },
              body: data ? JSON.stringify(data) : undefined,
            });
            return this.handleResponse<T>(retryResponse);
          }
          throw new Error(
            errorData.message || "Could not refresh CSRF token after failure",
          );
        }
        // Non-CSRF 403 — body already consumed, throw with the message we read.
        throw new Error(
          errorData.message ||
            `Error ${response.status}: ${response.statusText}`,
        );
      }
    }

    return this.handleResponse<T>(response);
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const { params, skipCsrf = false, ...requestOptions } = options;

    let token = null;
    if (!skipCsrf) {
      token = await this.ensureCsrfToken();
      if (!token) {
        console.warn("Could not fetch CSRF token for PUT request");
      }
    }

    const url = this.buildUrl(endpoint, params);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(requestOptions.headers as Record<string, string>),
    };

    if (token && !skipCsrf) {
      headers["X-CSRF-Token"] = token;
    }

    const response = await fetch(url, {
      method: "PUT",
      credentials: "include",
      ...requestOptions,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 403) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        // body unparseable — fall through to handleResponse
      }

      if (errorData !== null) {
        if (errorData.error === "CSRF validation failed") {
          this.csrfToken = null;
          token = await this.ensureCsrfToken();
          if (token) {
            const retryResponse = await fetch(url, {
              method: "PUT",
              credentials: "include",
              ...requestOptions,
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": token,
                ...requestOptions.headers,
              },
              body: data ? JSON.stringify(data) : undefined,
            });
            return this.handleResponse<T>(retryResponse);
          }
          throw new Error(
            errorData.message || "Could not refresh CSRF token after failure",
          );
        }
        throw new Error(
          errorData.message ||
            `Error ${response.status}: ${response.statusText}`,
        );
      }
    }

    return this.handleResponse<T>(response);
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const { params, skipCsrf = false, ...requestOptions } = options;

    let token = null;
    if (!skipCsrf) {
      token = await this.ensureCsrfToken();
      if (!token) {
        console.warn("Could not fetch CSRF token for PATCH request");
      }
    }

    const url = this.buildUrl(endpoint, params);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(requestOptions.headers as Record<string, string>),
    };

    if (token && !skipCsrf) {
      headers["X-CSRF-Token"] = token;
    }

    const response = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      ...requestOptions,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 403) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        // body unparseable — fall through to handleResponse
      }

      if (errorData !== null) {
        if (errorData.error === "CSRF validation failed") {
          this.csrfToken = null;
          token = await this.ensureCsrfToken();
          if (token) {
            const retryResponse = await fetch(url, {
              method: "PATCH",
              credentials: "include",
              ...requestOptions,
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": token,
                ...requestOptions.headers,
              },
              body: data ? JSON.stringify(data) : undefined,
            });
            return this.handleResponse<T>(retryResponse);
          }
          throw new Error(
            errorData.message || "Could not refresh CSRF token after failure",
          );
        }
        throw new Error(
          errorData.message ||
            `Error ${response.status}: ${response.statusText}`,
        );
      }
    }

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, skipCsrf = false, ...requestOptions } = options;

    let token = null;
    if (!skipCsrf) {
      token = await this.ensureCsrfToken();
      if (!token) {
        console.warn("Could not fetch CSRF token for DELETE request");
      }
    }

    const url = this.buildUrl(endpoint, params);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(requestOptions.headers as Record<string, string>),
    };

    if (token && !skipCsrf) {
      headers["X-CSRF-Token"] = token;
    }

    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      ...requestOptions,
      headers,
    });

    if (response.status === 403) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        // body unparseable — fall through to handleResponse
      }

      if (errorData !== null) {
        if (errorData.error === "CSRF validation failed") {
          this.csrfToken = null;
          token = await this.ensureCsrfToken();
          if (token) {
            const retryResponse = await fetch(url, {
              method: "DELETE",
              credentials: "include",
              ...requestOptions,
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": token,
                ...requestOptions.headers,
              },
            });
            return this.handleResponse<T>(retryResponse);
          }
          throw new Error(
            errorData.message || "Could not refresh CSRF token after failure",
          );
        }
        throw new Error(
          errorData.message ||
            `Error ${response.status}: ${response.statusText}`,
        );
      }
    }

    return this.handleResponse<T>(response);
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const base = this.baseUrl || window.location.origin;
    const url = new URL(`${base}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorData: any;

      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorMessage;

        if (
          response.status === 403 &&
          errorData.error === "CSRF validation failed"
        ) {
          this.csrfToken = null;
        }

        throw new Error(errorMessage);
      } catch (e) {
        // If parsing failed, throw with the original error
        if (e instanceof Error && e.message !== errorMessage) {
          console.error("Error parsing error response:", e);
          throw new Error(errorMessage, { cause: e });
        }
        throw e;
      }
    }

    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return {} as T;
    }

    return await response.json();
  }

  resetCsrfToken(): void {
    this.csrfToken = null;
    this.tokenPromise = null;
  }
}

export const httpClient = new HttpClient(apiConfig.baseUrl);
