import pkceChallenge from "pkce-challenge";

const STORAGE_KEYS = {
  CODE_VERIFIER: "pkce_code_verifier",
  AUTH_STATE: "pkce_auth_state",
};

export class PKCEAuthService {
  static async initiatePKCEFlow() {
    const result = await pkceChallenge();
    const codeVerifier = result.code_verifier;
    const codeChallenge = result.code_challenge;

    const state = this.generateRandomState();

    this.storeCodeVerifier(codeVerifier);
    this.storeAuthState(state);

    return {
      codeChallenge,
      state,
    };
  }

  static getAndClearCodeVerifier(): string | null {
    const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
    sessionStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
    return codeVerifier;
  }

  static verifyAuthState(returnedState: string): boolean {
    const storedState = sessionStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
    return storedState === returnedState;
  }

  private static storeCodeVerifier(codeVerifier: string) {
    sessionStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
  }

  private static storeAuthState(state: string) {
    sessionStorage.setItem(STORAGE_KEYS.AUTH_STATE, state);
  }

  private static generateRandomState(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }
}
