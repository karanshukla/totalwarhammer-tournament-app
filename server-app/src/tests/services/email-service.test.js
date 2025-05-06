// Tests for email-service.js
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

// Mock the Resend module
import { Resend } from "resend"; // We'll mock this import directly

// Mock implementation
const mockEmailSend = {
  calls: [],
  response: { id: "mock-email-id", error: null },
  reset() {
    this.calls = [];
    this.response = { id: "mock-email-id", error: null };
  },
};

// Mock the Resend constructor and emails.send method
Resend.prototype.constructor = function () {
  return this;
};

Resend.prototype.emails = {
  send: async (params) => {
    mockEmailSend.calls.push(params);
    return mockEmailSend.response;
  },
};

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
