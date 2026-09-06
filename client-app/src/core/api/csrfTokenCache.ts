export interface SessionStatus {
  valid: boolean;
  sessionId: string | null;
}

/**
 * Fetches and caches the CSRF token every mutating request needs, and backs
 * the session-status check that refreshes it as a side effect.
 */
export class CsrfTokenCache {
  private token: string | null = null;
  private tokenPromise: Promise<string | null> | null = null;

  constructor(private readonly baseUrl: string) {}

  /**
   * Check if the current session is valid and functioning.
   * This also refreshes the cached CSRF token as a side effect.
   */
  async checkSessionStatus(): Promise<SessionStatus> {
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

      if (data.csrfToken) {
        this.token = data.csrfToken;
      }

      return { valid: true, sessionId: data.sessionId };
    } catch {
      // Swallowed deliberately: a failed session check just reports invalid.
      return { valid: false, sessionId: null };
    }
  }

  async ensureToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
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

          this.token = data.csrfToken;

          resolve(this.token);
        })
        .catch((error) => {
          console.error("Error fetching CSRF token:", error);
          this.token = null;
          resolve(null);
        })
        .finally(() => {
          this.tokenPromise = null;
        });
    });

    return this.tokenPromise;
  }

  /** Drop the cached token only, e.g. after the server rejects it as stale. */
  clearToken(): void {
    this.token = null;
  }

  /** Full reset: drop the token and any in-flight fetch for one. */
  clear(): void {
    this.token = null;
    this.tokenPromise = null;
  }
}
