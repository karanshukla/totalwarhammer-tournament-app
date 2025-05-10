// Tests for email-service.js
import assert from "node:assert/strict";
import { describe, it, beforeEach, mock } from "node:test";

import EmailService from "../../infrastructure/services/email-service.js";

const mockSendFn = mock.fn();
const mockResendClient = {
  emails: {
    send: mockSendFn,
  },
};

const successResponse = { id: "mock-email-id", error: null };

// Create a testing subclass of EmailService that replaces the Resend client
class TestEmailService extends EmailService {
  constructor() {
    super();
    Object.defineProperty(this, "resendClient", {
      get: function () {
        return mockResendClient;
      },
    });
  }
}

describe("EmailService", () => {
  let emailService;

  beforeEach(() => {
    mockSendFn.mock.resetCalls();

    mockSendFn.mock.mockImplementation(() => Promise.resolve(successResponse));

    emailService = new TestEmailService();
  });

  it("should send an email successfully", async () => {
    const emailData = {
      subject: "Test Email",
      html: "<p>Test content</p>",
    };

    const result = await emailService.sendEmail(emailData);

    assert.equal(result.success, true);
    assert.equal(mockSendFn.mock.callCount(), 1);

    const sentEmailData = mockSendFn.mock.calls[0].arguments[0];
    assert.equal(sentEmailData.subject, "Test Email");
    assert.equal(sentEmailData.html, "<p>Test content</p>");
  });

  it("should throw when subject is missing", async () => {
    await assert.rejects(
      async () => await emailService.sendEmail({ html: "<p>Test</p>" }),
      { message: "Email subject is required" }
    );

    assert.equal(mockSendFn.mock.callCount(), 0);
  });

  it("should throw when html content is missing", async () => {
    await assert.rejects(
      async () => await emailService.sendEmail({ subject: "Test" }),
      { message: "Email must have text or HTML content" }
    );

    assert.equal(mockSendFn.mock.callCount(), 0);
  });
});
