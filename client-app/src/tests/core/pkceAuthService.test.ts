import { describe, it, expect, vi, beforeEach } from "vitest";
import pkceChallenge from "pkce-challenge";

// Mock dependencies before importing the service
vi.mock("pkce-challenge", () => ({
  default: vi.fn(),
}));

// Mock sessionStorage before importing the module
const sessionStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => sessionStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageMock.store[key];
  }),
};

// Mock window.crypto before importing the module
const mockCrypto = {
  getRandomValues: vi.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256; // Deterministic "random" values for testing
    }
    return array;
  }),
};

// Mock the global objects needed by PKCEAuthService
vi.stubGlobal("sessionStorage", sessionStorageMock);
vi.stubGlobal("localStorage", sessionStorageMock); // Mock localStorage if needed
vi.stubGlobal("crypto", mockCrypto); // Mock crypto for generating random values
vi.stubGlobal("window", {
  crypto: mockCrypto,
  sessionStorage: sessionStorageMock,
  localStorage: sessionStorageMock,
}); // Mock window to include crypto and storage

import { PKCEAuthService } from "../../core/auth/pkceAuthService";

describe("PKCEAuthService", () => {
  beforeEach(() => {
    // Reset mock stores
    sessionStorageMock.store = {};
    vi.clearAllMocks();
  });

  describe("initiatePKCEFlow", () => {
    it("should generate and store code verifier and state", async () => {
      // Mock PKCE challenge response
      const mockPkceResult = {
        code_verifier: "test_verifier",
        code_challenge: "test_challenge",
      };
      (pkceChallenge as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPkceResult
      );

      // Call the method
      const result = await PKCEAuthService.initiatePKCEFlow();

      // Verify pkce-challenge was called
      expect(pkceChallenge).toHaveBeenCalledTimes(1);

      // Verify sessionStorage was updated with code verifier and state
      expect(sessionStorageMock.setItem).toHaveBeenCalledTimes(2);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        "pkce_code_verifier",
        "test_verifier"
      );
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        "pkce_auth_state",
        expect.any(String)
      );

      // Verify correct values returned
      expect(result).toEqual({
        codeChallenge: "test_challenge",
        state: expect.any(String),
      });
    });
  });

  describe("getAndClearCodeVerifier", () => {
    it("should retrieve and clear code verifier from session storage", () => {
      // Setup
      sessionStorageMock.store["pkce_code_verifier"] = "stored_verifier";

      // Call the method
      const result = PKCEAuthService.getAndClearCodeVerifier();

      // Verify session storage interactions
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith(
        "pkce_code_verifier"
      );
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(
        "pkce_code_verifier"
      );
      expect(result).toBe("stored_verifier");
    });

    it("should return null if no code verifier exists", () => {
      // Call the method
      const result = PKCEAuthService.getAndClearCodeVerifier();

      // Verify
      expect(result).toBeNull();
    });
  });

  describe("verifyAuthState", () => {
    it("should return true when auth states match", () => {
      // Setup
      sessionStorageMock.store["pkce_auth_state"] = "test_state";

      // Call the method
      const result = PKCEAuthService.verifyAuthState("test_state");

      // Verify
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith(
        "pkce_auth_state"
      );
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(
        "pkce_auth_state"
      );
      expect(result).toBe(true);
    });

    it("should return false when auth states do not match", () => {
      // Setup
      sessionStorageMock.store["pkce_auth_state"] = "stored_state";

      // Call the method
      const result = PKCEAuthService.verifyAuthState("different_state");

      // Verify
      expect(result).toBe(false);
    });

    it("should return false when no stored state exists", () => {
      // Call the method
      const result = PKCEAuthService.verifyAuthState("any_state");

      // Verify
      expect(result).toBe(false);
    });
  });

  describe("generateRandomState", () => {
    it("should generate a state with expected format", async () => {
      // Mock PKCE challenge response
      (pkceChallenge as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        code_verifier: "test_verifier",
        code_challenge: "test_challenge",
      });

      // Call initiatePKCEFlow which uses generateRandomState
      const result = await PKCEAuthService.initiatePKCEFlow();

      // Verify crypto.getRandomValues was called with a Uint8Array
      expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      );

      // With our mock implementation, we should be able to predict the state value
      const expectedStateArray = Array.from(new Uint8Array(32), (_, i) =>
        (i % 256).toString(16).padStart(2, "0")
      ).join("");
      expect(result.state).toBe(expectedStateArray);
    });
  });
});
