import { apiConfig } from "../config/apiConfig";
import { CsrfTokenCache, type SessionStatus } from "./csrfTokenCache";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipCsrf?: boolean;
}

class HttpClient {
  private baseUrl: string;
  private csrf: CsrfTokenCache;
  // Set by the app root. The HTTP layer can't import the user store directly
  // without a cycle (store -> feature api -> httpClient), so the app registers
  // what should happen when the server tells us the session is gone.
  private unauthorizedHandler: (() => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.csrf = new CsrfTokenCache(baseUrl);
  }

  async checkSessionStatus(): Promise<SessionStatus> {
    return this.csrf.checkSessionStatus();
  }

  async ensureCsrfToken(): Promise<string | null> {
    return this.csrf.ensureToken();
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
    const isAuthEndpoint =
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/logout") ||
      endpoint.includes("/auth/token");

    // Guest endpoints mint a session, so they always need the token even
    // though they are otherwise unauthenticated.
    const isGuestEndpoint = endpoint.includes("/guest");

    return this.mutate<T>("POST", endpoint, data, options, {
      skipCsrfByDefault: isAuthEndpoint && !isGuestEndpoint,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    return this.mutate<T>("PUT", endpoint, data, options);
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    return this.mutate<T>("PATCH", endpoint, data, options);
  }

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.mutate<T>("DELETE", endpoint, undefined, options);
  }

  /**
   * Every mutating verb needs the same CSRF dance: attach the cached token,
   * and if the server rejects it, drop the token, fetch a fresh one and replay
   * the request once. Four hand-rolled copies of this drifted apart.
   */
  private async mutate<T>(
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    endpoint: string,
    data: unknown,
    options: RequestOptions,
    { skipCsrfByDefault = false }: { skipCsrfByDefault?: boolean } = {},
  ): Promise<T> {
    const { params, skipCsrf = skipCsrfByDefault, ...requestOptions } = options;

    let token: string | null = null;
    if (!skipCsrf) {
      token = await this.csrf.ensureToken();
      if (!token) {
        console.warn(`Could not fetch CSRF token for ${method} request`);
      }
    }

    const url = this.buildUrl(endpoint, params);
    const body = data ? JSON.stringify(data) : undefined;

    const send = (csrfToken: string | null) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(requestOptions.headers as Record<string, string>),
      };
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }
      return fetch(url, {
        method,
        credentials: "include",
        ...requestOptions,
        headers,
        body,
      });
    };

    const response = await send(skipCsrf ? null : token);

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
          this.csrf.clearToken();
          const freshToken = await this.csrf.ensureToken();
          if (freshToken) {
            return this.handleResponse<T>(await send(freshToken));
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
      // A 401 means the server-side session is gone. Without this the client
      // kept its persisted "logged in" state and rendered raw `Error 401`
      // messages in place of content, with no route back to a sign-in form.
      if (response.status === 401) {
        this.csrf.clear();
        this.unauthorizedHandler?.();
      }

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
          this.csrf.clearToken();
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

  setUnauthorizedHandler(handler: (() => void) | null): void {
    this.unauthorizedHandler = handler;
  }

  resetCsrfToken(): void {
    this.csrf.clear();
  }
}

export const httpClient = new HttpClient(apiConfig.baseUrl);
