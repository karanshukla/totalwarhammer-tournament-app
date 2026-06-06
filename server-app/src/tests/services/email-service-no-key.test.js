import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

// Mock env to simulate missing RESEND_API_KEY before importing EmailService
mock.module("../../infrastructure/config/env.js", {
  namedExports: { resendApiKey: null },
});

// Mock the resend package so the module can be imported without the real package
mock.module("resend", {
  namedExports: {
    Resend: class MockResend {
      constructor(key) {
        this.key = key;
      }
    },
  },
});

const emailServiceModule =
  await import("../../infrastructure/services/email-service.js");
const EmailService = emailServiceModule.default;

describe("EmailService resendClient getter — missing API key", () => {
  it("should throw when RESEND_API_KEY is not set", () => {
    const svc = new EmailService();
    assert.throws(() => svc.resendClient, {
      message: "RESEND_API_KEY is not set in environment variables",
    });
  });
});
