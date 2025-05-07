import { apiConfig } from "../config/apiConfig";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipCsrf?: boolean;
}

class HttpClient {
  private baseUrl: string;
  private csrfToken: string | null = null;
  private tokenPromise: Promise<string | null> | null = null;
  private debug: boolean = false; // Set to true for debugging

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async ensureCsrfToken(): Promise<string | null> {
    if (this.csrfToken) {
      return this.csrfToken;
    }
    if (this.tokenPromise) {
      return this.tokenPromise;
    }
    this.tokenPromise = new Promise<string | null>((resolve) => {
      if (this.debug) console.log("Fetching new CSRF token...");

      fetch(`${this.baseUrl}/auth/csrf-token`, {
        method: "GET",
        credentials: "include",
        cache: "no-cache",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to fetch CSRF token: ${response.statusText}`
            );
          }
          return response.json();
        })
        .then((data) => {
          if (!data.csrfToken) {
            throw new Error("Server did not return a CSRF token");
          }

          this.csrfToken = data.csrfToken;

          if (this.debug) {
            console.log("CSRF token fetch successful");
            console.log(`Session ID from server: ${data.sessionId || "none"}`);
          }

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
    options: RequestOptions = {}
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
      if (this.debug) console.log(`Adding CSRF token to ${endpoint} request`);
    }

    if (this.debug) console.log(`Making POST request to ${endpoint}`);

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      ...requestOptions,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 403) {
      try {
        const errorData = await response.json();

        if (this.debug) console.log("Received 403 response:", errorData);

        if (errorData.error === "CSRF validation failed") {
          this.csrfToken = null;
          if (this.debug)
            console.log("CSRF validation failed, refreshing token...");

          token = await this.ensureCsrfToken();

          if (token) {
            if (this.debug) console.log("Retrying request with new CSRF token");

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
          } else {
            throw new Error("Could not refresh CSRF token after failure");
          }
        }
      } catch (e) {
        console.error("Error handling CSRF retry:", e);
      }
    }

    return this.handleResponse<T>(response);
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
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
      if (this.debug)
        console.log(`Adding CSRF token to ${endpoint} PUT request`);
    }

    if (this.debug) console.log(`Making PUT request to ${endpoint}`);

    const response = await fetch(url, {
      method: "PUT",
      credentials: "include",
      ...requestOptions,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 403) {
      try {
        const errorData = await response.json();

        if (this.debug) console.log("Received 403 response:", errorData);

        if (errorData.error === "CSRF validation failed") {
          this.csrfToken = null;
          if (this.debug)
            console.log("CSRF validation failed, refreshing token...");

          token = await this.ensureCsrfToken();

          if (token) {
            if (this.debug)
              console.log("Retrying PUT request with new CSRF token");

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
          } else {
            throw new Error("Could not refresh CSRF token after failure");
          }
        }
      } catch (e) {
        console.error("Error handling CSRF retry:", e);
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
      if (this.debug)
        console.log(`Adding CSRF token to ${endpoint} DELETE request`);
    }

    if (this.debug) console.log(`Making DELETE request to ${endpoint}`);

    try {
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
        ...requestOptions,
        headers,
      });

      if (response.status === 403) {
        try {
          const errorData = await response.json();

          if (this.debug) console.log("Received 403 response:", errorData);

          if (errorData.error === "CSRF validation failed") {
            this.csrfToken = null;
            if (this.debug)
              console.log("CSRF validation failed, refreshing token...");

            token = await this.ensureCsrfToken();

            if (token) {
              if (this.debug)
                console.log("Retrying DELETE request with new CSRF token");

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
            } else {
              throw new Error("Could not refresh CSRF token after failure");
            }
          }
        } catch (e) {
          console.error("Error handling CSRF retry:", e);
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      if (this.debug) {
        console.error(`DELETE request to ${endpoint} failed:`, error);
      }
      throw error;
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

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
      let errorData: any = {};

      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorMessage;

        if (
          response.status === 403 &&
          errorData.error === "CSRF validation failed"
        ) {
          if (this.debug) {
            console.error("CSRF validation failed:", {
              message: errorData.message,
              debug: errorData.debug || {},
              status: response.status,
            });

            if (errorData.debug) {
              console.log("CSRF Debug Info:", {
                hasSession: errorData.debug.hasSession,
                hasSessionId: errorData.debug.hasSessionId,
                hasToken: errorData.debug.hasToken,
                serverExpectsToken: true,
                clientProvidedToken: !!this.csrfToken,
              });
            }
          }

          this.csrfToken = null;
        } else if (this.debug) {
          console.error("API Error Response:", {
            status: response.status,
            data: errorData,
          });
        }

        throw new Error(errorMessage);
      } catch (e) {
        // If parsing failed, throw with the original error
        if (e instanceof Error && e.message !== errorMessage) {
          console.error("Error parsing error response:", e);
          throw new Error(errorMessage);
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
    if (this.debug) console.log("Explicitly resetting CSRF token");
    this.csrfToken = null;
    this.tokenPromise = null;
  }
}

export const httpClient = new HttpClient(apiConfig.baseUrl);
