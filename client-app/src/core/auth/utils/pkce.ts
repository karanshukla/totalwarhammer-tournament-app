/**
 * PKCE (Proof Key for Code Exchange) utility functions
 * Used to secure authorization code flows against interception attacks
 */
export class PKCEUtil {
  /**
   * Generates a random code verifier string
   * @param length The length of the verifier (default: 64)
   * @returns A random string of the specified length
   */
  static generateCodeVerifier(length = 64): string {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const charsetLen = charset.length;
    let result = "";

    // Use crypto.getRandomValues for secure random values
    const values = new Uint8Array(length);
    window.crypto.getRandomValues(values);

    for (let i = 0; i < length; i++) {
      result += charset.charAt(values[i] % charsetLen);
    }

    return result;
  }

  /**
   * Creates a code challenge from a code verifier using SHA-256
   * @param codeVerifier The code verifier string
   * @returns The code challenge as a base64url encoded string
   */
  static async createCodeChallenge(codeVerifier: string): Promise<string> {
    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);

    // Create SHA-256 hash using the Web Crypto API
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);

    // Convert ArrayBuffer to Base64URL string
    return this.arrayBufferToBase64URL(hashBuffer);
  }

  /**
   * Generates both a code verifier and its corresponding challenge
   * @returns A Promise resolving to an object containing both the code verifier and challenge
   */
  static async generatePKCEPair() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.createCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
    };
  }

  /**
   * Converts an ArrayBuffer to a Base64URL string
   * @param buffer The ArrayBuffer to convert
   * @returns A Base64URL encoded string
   */
  private static arrayBufferToBase64URL(buffer: ArrayBuffer): string {
    // Convert ArrayBuffer to regular Base64 string
    const bytes = new Uint8Array(buffer);
    let base64 = "";
    const binString = Array.from(bytes)
      .map((x) => String.fromCharCode(x))
      .join("");
    base64 = btoa(binString);

    // Convert Base64 to Base64URL (RFC 7636 compliant)
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
}
