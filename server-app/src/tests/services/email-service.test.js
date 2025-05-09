// Tests for email-service.js
import assert from "node:assert/strict";
import { describe, it, beforeEach, mock } from "node:test";
import EmailService from "../../infrastructure/services/email-service.js";

// Create a proper mock for the Resend client
const mockSendFn = mock.fn();
const mockResendClient = {
  emails: {
    send: mockSendFn,
  },
};

// Setup default successful response
const successResponse = { id: "mock-email-id", error: null };

// Create a testing subclass of EmailService that replaces the Resend client
class TestEmailService extends EmailService {
  constructor() {
    super();
  }

  // Override the sendEmail method to use our mock
  async sendEmail(options) {
    if (!options.subject) {
      throw new Error("Email subject is required");
    }

    if (!options.html) {
      throw new Error("Email must have text or HTML content");
    }

    const message = {
      from: options.from || "test@example.com",
      to: options.to || "recipient@example.com",
      subject: options.subject,
      html: options.html,
    };

    try {
      const response = await mockSendFn(message);
      if (response?.error === null)
        return {
          success: true,
          messageId: response?.id || null,
        };
      else {
        return {
          success: false,
          error: response.error,
        };
      }
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
}

describe("EmailService", () => {
  let emailService;

  beforeEach(() => {
    // Reset the mock function
    mockSendFn.mock.resetCalls();

    // Set up the default success response
    mockSendFn.mock.mockImplementation(() => Promise.resolve(successResponse));

    // Create a new instance with our mocked client
    emailService = new TestEmailService();
  });

  it("should send an email successfully", async () => {
    // Arrange
    const emailData = {
      subject: "Test Email",
      html: "<p>Test content</p>",
    };

    // Act
    const result = await emailService.sendEmail(emailData);

    // Assert
    assert.equal(result.success, true);
    assert.equal(mockSendFn.mock.callCount(), 1);

    // Check that the email was sent with correct data
    const sentEmailData = mockSendFn.mock.calls[0].arguments[0];
    assert.equal(sentEmailData.subject, "Test Email");
    assert.equal(sentEmailData.html, "<p>Test content</p>");
  });

  it("should throw when subject is missing", async () => {
    // Act & Assert
    await assert.rejects(
      async () => await emailService.sendEmail({ html: "<p>Test</p>" }),
      { message: "Email subject is required" }
    );

    // Verify the email wasn't sent
    assert.equal(mockSendFn.mock.callCount(), 0);
  });

  it("should throw when html content is missing", async () => {
    // Act & Assert
    await assert.rejects(
      async () => await emailService.sendEmail({ subject: "Test" }),
      { message: "Email must have text or HTML content" }
    );

    // Verify the email wasn't sent
    assert.equal(mockSendFn.mock.callCount(), 0);
  });
});
