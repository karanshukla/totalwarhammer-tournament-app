// filepath: f:\Development\totalwarhammer-tournament-app\server-app\src\tests\services\jwt-service.test.js
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
});
