import { SHA256 } from "crypto-js";
import Base64 from "crypto-js/enc-base64url";

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

    // Use crypto.getRandomValues when available (for better randomness)
    if (window.crypto && window.crypto.getRandomValues) {
      const values = new Uint8Array(length);
      window.crypto.getRandomValues(values);
      for (let i = 0; i < length; i++) {
        result += charset.charAt(values[i] % charsetLen);
      }
    } else {
      // Fallback to Math.random if crypto API isn't available
      for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charsetLen));
      }
    }

    return result;
  }

  /**
   * Creates a code challenge from a code verifier using SHA-256
   * @param codeVerifier The code verifier string
   * @returns The code challenge as a base64url encoded string
   */
  static createCodeChallenge(codeVerifier: string): string {
    // Create SHA-256 hash of the code verifier
    const hash = SHA256(codeVerifier);

    // Base64url encode the hash (RFC 7636 compliant)
    return Base64.stringify(hash)
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  /**
   * Generates both a code verifier and its corresponding challenge
   * @returns An object containing both the code verifier and challenge
   */
  static generatePKCEPair() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.createCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
    };
  }
}
