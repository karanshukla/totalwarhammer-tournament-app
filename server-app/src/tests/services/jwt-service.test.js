// Tests for jwt-service.js using Node.js built-in test runner
import assert from "node:assert";
import { describe, it, beforeEach, mock, afterEach } from "node:test";

import jsonwebtoken from "jsonwebtoken";

import JwtService from "../../infrastructure/services/jwt-service.js";

// Mock jsonwebtoken module with simpler implementations
const mockToken = "mock.signed.token";
const mockDecodedToken = {
  id: "123",
  username: "testuser",
  exp: 0,
  tokenType: "standard",
};

mock.method(jsonwebtoken, "sign", () => mockToken);
mock.method(jsonwebtoken, "verify", () => mockDecodedToken);
mock.method(jsonwebtoken, "decode", () => mockDecodedToken);

// Original environment variables
const originalEnv = { ...process.env };

describe("JwtService", () => {
  // eslint-disable-next-line no-unused-vars
  let jwtService;
  const testSecret = "test-secret-key";

  beforeEach(() => {
    // Reset environment variables for each test
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = testSecret;
    process.env.JWT_EXPIRES_IN = "1h";
    process.env.JWT_REMEMBER_ME_EXPIRES_IN = "7d";
    process.env.JWT_GUEST_EXPIRES_IN = "48h";

    // Create a new JwtService instance
    jwtService = new JwtService();

    // Reset mocks
    jsonwebtoken.sign.mock.resetCalls();
    jsonwebtoken.verify.mock.resetCalls();
    jsonwebtoken.decode.mock.resetCalls();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = { ...originalEnv };
  });

  describe("constructor", () => {
    it("should initialize with config values if provided", () => {
      const customJwtService = new JwtService({
        secretKey: "custom-secret",
        expiresIn: "2h",
      });

      assert.strictEqual(customJwtService.secretKey, "custom-secret");
      assert.strictEqual(customJwtService.defaultExpiresIn, "2h");
    });

    it("should initialize with environment variables if config not provided", () => {
      const jwtService = new JwtService();

      assert.strictEqual(jwtService.secretKey, testSecret);
      assert.strictEqual(jwtService.defaultExpiresIn, "1h");
    });

    it("should throw an error if no secret key is available", () => {
      delete process.env.JWT_SECRET;

      assert.throws(() => new JwtService(), {
        message: "JWT secret key is required",
      });
    });

    it("should set token expiration times correctly", () => {
      const jwtService = new JwtService();

      assert.deepStrictEqual(jwtService.tokenExpiration, {
        standard: "1h",
        rememberMe: "7d",
        guest: "48h",
      });
    });
  });

  // Note: sign/verify/decode inside JwtService are captured via destructuring at
  // module load time (before mock.method runs), so the methods use real JWT functions.
  // Tests below use real token generation with the testSecret.

  describe("generateToken", () => {
    it("should return a string token", () => {
      const svc = new JwtService();
      const token = svc.generateToken({ userId: "abc" });
      assert.strictEqual(typeof token, "string");
      assert.ok(token.split(".").length === 3);
    });

    it("should embed userId and tokenType=standard in payload", () => {
      const svc = new JwtService();
      const token = svc.generateToken({ userId: "abc" });
      const decoded = svc.decodeToken(token);
      assert.strictEqual(decoded.userId, "abc");
      assert.strictEqual(decoded.tokenType, "standard");
    });

    it("should embed tokenType=rememberMe for rememberMe type", () => {
      const svc = new JwtService();
      const token = svc.generateToken({ userId: "u1" }, "rememberMe");
      const decoded = svc.decodeToken(token);
      assert.strictEqual(decoded.tokenType, "rememberMe");
    });

    it("should embed tokenType=guest for guest type", () => {
      const svc = new JwtService();
      const token = svc.generateToken({ userId: "u2" }, "guest");
      const decoded = svc.decodeToken(token);
      assert.strictEqual(decoded.tokenType, "guest");
    });

    it("should fall back to defaultExpiresIn for unknown tokenType", () => {
      const svc = new JwtService();
      // Should not throw — falls back to defaultExpiresIn
      const token = svc.generateToken({ userId: "u3" }, "unknown");
      assert.ok(typeof token === "string");
    });
  });

  describe("decodeToken", () => {
    it("should decode a valid JWT without verification", () => {
      const svc = new JwtService();
      const token = svc.generateToken({ role: "admin" });
      const decoded = svc.decodeToken(token);
      assert.strictEqual(decoded.role, "admin");
    });

    it("should return null for an invalid token string", () => {
      const svc = new JwtService();
      const result = svc.decodeToken("not.a.jwt");
      assert.strictEqual(result, null);
    });
  });

  describe("verifyToken", () => {
    it("should successfully verify a token signed with the same secret", () => {
      const svc = new JwtService();
      const token = svc.generateToken({ userId: "xyz" });
      const decoded = svc.verifyToken(token);
      assert.strictEqual(decoded.userId, "xyz");
    });

    it("should throw JsonWebTokenError for a token signed with a different secret", () => {
      const svc = new JwtService();
      const otherSvc = new JwtService({ secretKey: "other-secret" });
      const token = otherSvc.generateToken({ userId: "xyz" });
      assert.throws(() => svc.verifyToken(token), {
        name: "JsonWebTokenError",
      });
    });
  });

  describe("isTokenExpired", () => {
    it("should return false for a freshly generated token", () => {
      const svc = new JwtService();
      const token = svc.generateToken({ userId: "u1" });
      assert.strictEqual(svc.isTokenExpired(token), false);
    });

    it("should return true when decoded exp is in the past", () => {
      const svc = new JwtService();
      // Override decodeToken on the instance to return an already-expired payload
      svc.decodeToken = () => ({ exp: 0, userId: "u1" });
      assert.strictEqual(svc.isTokenExpired("any-token"), true);
    });
  });

  describe("getTokenType", () => {
    it("should return 'standard' for a standard token", () => {
      const svc = new JwtService();
      const token = svc.generateToken({ userId: "u1" });
      assert.strictEqual(svc.getTokenType(token), "standard");
    });

    it("should return 'guest' for a guest token", () => {
      const svc = new JwtService();
      const token = svc.generateToken({ userId: "u1" }, "guest");
      assert.strictEqual(svc.getTokenType(token), "guest");
    });

    it("should return 'standard' fallback when tokenType field is absent", () => {
      const svc = new JwtService();
      // Override decodeToken on the instance to simulate missing tokenType
      svc.decodeToken = () => ({ id: "x" });
      assert.strictEqual(svc.getTokenType("any-token"), "standard");
    });
  });
});
