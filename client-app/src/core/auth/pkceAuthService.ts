import pkceChallenge from "pkce-challenge";

const STORAGE_KEYS = {
  CODE_VERIFIER: "pkce_code_verifier",
  AUTH_STATE: "pkce_auth_state",
};

export class PKCEAuthService {
  /**
   * Initialize PKCE auth flow by generating and storing a code verifier
   * @returns Object containing the code challenge and randomly generated state
   */
  static async initiatePKCEFlow() {
    // Generate PKCE code verifier and challenge
    const result = await pkceChallenge();
    const codeVerifier = result.code_verifier;
    const codeChallenge = result.code_challenge;

    // Generate random state for CSRF protection
    const state = this.generateRandomState();

    // Store code verifier and state in sessionStorage
    this.storeCodeVerifier(codeVerifier);
    this.storeAuthState(state);

    return {
      codeChallenge,
      state,
    };
  }

  /**
   * Retrieve stored code verifier and clear it from storage
   * @returns The stored code verifier or null if not found
   */
  static getAndClearCodeVerifier(): string | null {
    const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
    sessionStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
    return codeVerifier;
  }

  /**
   * Verify that the returned state matches the stored state
   * @param returnedState The state returned from the authorization server
   * @returns Boolean indicating if the states match
   */
  static verifyAuthState(returnedState: string): boolean {
    const storedState = sessionStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
    return storedState === returnedState;
  }

  /**
   * Store code verifier in sessionStorage
   * @param codeVerifier The code verifier to store
   */
  private static storeCodeVerifier(codeVerifier: string) {
    sessionStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
  }

  /**
   * Store authentication state in sessionStorage
   * @param state The state value to store
   */
  private static storeAuthState(state: string) {
    sessionStorage.setItem(STORAGE_KEYS.AUTH_STATE, state);
  }

  /**
   * Generate a random state value for CSRF protection
   * @returns A random string to be used as state
   */
  private static generateRandomState(): string {
    // Generate a simpler random string for state
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }
}
