// Tests for email-service.js
import assert from "node:assert/strict";
import { describe, it, beforeEach, mock } from "node:test";

// Setup mock implementation
const mockEmailSend = {
  calls: [],
  response: { id: "mock-email-id", error: null },
  reset() {
    this.calls = [];
    this.response = { id: "mock-email-id", error: null };
  },
};

// Mock the Resend module before importing EmailService
mock.method(globalThis, "fetch", async () => {
  return {
    ok: true,
    status: 200,
    json: async () => mockEmailSend.response,
  };
});

// Mock implementation of Resend
class MockResend {
  constructor(apiKey) {
    this.apiKey = apiKey || "test_resend_api_key";
    this.emails = {
      send: async (params) => {
        mockEmailSend.calls.push(params);
        return mockEmailSend.response;
      },
    };
  }
}

// Replace the real Resend with our mock
mock.module("resend", {
  Resend: MockResend,
});

// Import the service under test
import EmailService from "../../infrastructure/services/email-service.js";

describe("EmailService", () => {
  let emailService;

  beforeEach(() => {
    // Reset mocks before each test
    mockEmailSend.reset();

    // Create a new instance
    emailService = new EmailService();
  });

  it("should send an email successfully", async () => {
    // Act
    const result = await emailService.sendEmail({
      subject: "Test Email",
      html: "<p>Test content</p>",
    });

    // Assert
    assert.equal(result.success, true);
  });

  it("should throw when subject is missing", async () => {
    // Act & Assert
    await assert.rejects(
      async () => await emailService.sendEmail({ html: "<p>Test</p>" }),
      { message: "Email subject is required" }
    );
  });

  it("should throw when html content is missing", async () => {
    // Act & Assert
    await assert.rejects(
      async () => await emailService.sendEmail({ subject: "Test" }),
      { message: "Email must have text or HTML content" }
    );
  });
});
