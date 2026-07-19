import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

// Mock env to simulate a configured RESEND_API_KEY before importing EmailService
mock.module("../../infrastructure/config/env.js", {
  namedExports: { resendApiKey: "re_test_key" },
});

const resendConstructorCalls = [];

// Mock the resend package so the module can be imported without the real package
mock.module("resend", {
  namedExports: {
    Resend: class MockResend {
      constructor(key) {
        this.key = key;
        resendConstructorCalls.push(key);
      }
    },
  },
});

const emailServiceModule =
  await import("../../infrastructure/services/email-service.js");
const EmailService = emailServiceModule.default;

describe("EmailService resendClient getter — configured API key", () => {
  it("lazily instantiates a Resend client using the configured key", () => {
    const svc = new EmailService();
    const client = svc.resendClient;
    assert.equal(client.key, "re_test_key");
  });

  it("caches the client instance across repeated accesses", () => {
    const svc = new EmailService();
    const before = resendConstructorCalls.length;

    const first = svc.resendClient;
    const second = svc.resendClient;

    assert.equal(resendConstructorCalls.length, before + 1);
    assert.strictEqual(first, second);
  });
});
