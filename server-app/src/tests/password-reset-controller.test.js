import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockUserFindOne = mock.fn();
const mockUserFindById = mock.fn();
mock.module("../domain/models/user.js", {
  defaultExport: {
    findOne: mockUserFindOne,
    findById: mockUserFindById,
  },
});

const mockCreateResetToken = mock.fn();
const mockValidateResetToken = mock.fn();
mock.module("../domain/models/password-reset.js", {
  defaultExport: {
    createResetToken: mockCreateResetToken,
    validateResetToken: mockValidateResetToken,
  },
});

const mockSendEmail = mock.fn();
mock.module("../infrastructure/services/email-service.js", {
  defaultExport: class {
    sendEmail = mockSendEmail;
  },
});

mock.module("../infrastructure/config/env.js", {
  namedExports: { clientUrl: "http://localhost:5173" },
});

const mockCreatePasswordResetEmail = mock.fn(() => ({
  subject: "Reset your password",
  html: "<p>Reset link</p>",
}));
mock.module("../infrastructure/email-templates/password-reset-template.js", {
  namedExports: { createPasswordResetEmail: mockCreatePasswordResetEmail },
});

const { sendPasswordResetEmail, verifyResetToken, resetPassword } = await import(
  "../interfaces/http/controllers/password-reset-controller.js"
);

function mockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
}

describe("password-reset-controller", () => {
  beforeEach(() => {
    mockUserFindOne.mock.resetCalls();
    mockUserFindById.mock.resetCalls();
    mockCreateResetToken.mock.resetCalls();
    mockValidateResetToken.mock.resetCalls();
    mockSendEmail.mock.resetCalls();
    mockCreatePasswordResetEmail.mock.resetCalls();
    mockSendEmail.mock.mockImplementation(async () => ({ success: true }));
  });

  describe("sendPasswordResetEmail", () => {
    it("should return 400 for missing email", async () => {
      const req = { body: {} };
      const res = mockRes();
      await sendPasswordResetEmail(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 for email missing @ sign", async () => {
      const req = { body: { email: "notanemail" } };
      const res = mockRes();
      await sendPasswordResetEmail(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 200 without sending email when user is not found", async () => {
      mockUserFindOne.mock.mockImplementation(async () => null);
      const req = { body: { email: "ghost@example.com" } };
      const res = mockRes();
      await sendPasswordResetEmail(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockSendEmail.mock.calls.length, 0);
      const body = res.json.mock.calls[0].arguments[0];
      assert.strictEqual(body.success, true);
    });

    it("should create reset token and send email when user exists", async () => {
      mockUserFindOne.mock.mockImplementation(async () => ({ _id: "user1" }));
      mockCreateResetToken.mock.mockImplementation(async () => ({
        resetKey: "abc123token",
      }));
      const req = { body: { email: "found@example.com" } };
      const res = mockRes();
      await sendPasswordResetEmail(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockCreateResetToken.mock.calls.length, 1);
      assert.strictEqual(mockSendEmail.mock.calls.length, 1);
      const emailArgs = mockSendEmail.mock.calls[0].arguments[0];
      assert.strictEqual(emailArgs.to, "found@example.com");
    });

    it("should include reset link in email content", async () => {
      mockUserFindOne.mock.mockImplementation(async () => ({ _id: "user1" }));
      mockCreateResetToken.mock.mockImplementation(async () => ({
        resetKey: "mytoken456",
      }));
      const req = { body: { email: "user@example.com" } };
      const res = mockRes();
      await sendPasswordResetEmail(req, res);
      assert.strictEqual(mockCreatePasswordResetEmail.mock.calls.length, 1);
      const linkArg = mockCreatePasswordResetEmail.mock.calls[0].arguments[0];
      assert.ok(
        linkArg.includes("mytoken456"),
        "reset link should contain the token",
      );
    });

    it("should return 500 on unexpected error", async () => {
      mockUserFindOne.mock.mockImplementation(async () => {
        throw new Error("DB failure");
      });
      const req = { body: { email: "err@example.com" } };
      const res = mockRes();
      await sendPasswordResetEmail(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("verifyResetToken", () => {
    it("should return 400 if token is missing from body", async () => {
      const req = { body: {} };
      const res = mockRes();
      await verifyResetToken(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if token is invalid or expired", async () => {
      mockValidateResetToken.mock.mockImplementation(async () => null);
      const req = { body: { token: "badtoken" } };
      const res = mockRes();
      await verifyResetToken(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 200 with userId and expiry for a valid token", async () => {
      const createdAt = new Date(Date.now() - 5000);
      mockValidateResetToken.mock.mockImplementation(async () => ({
        userId: "user1",
        createdAt,
      }));
      const req = { body: { token: "validtoken" } };
      const res = mockRes();
      await verifyResetToken(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const data = res.json.mock.calls[0].arguments[0].data;
      assert.strictEqual(data.userId, "user1");
      assert.strictEqual(data.validUntil, createdAt.getTime() + 3600000);
    });

    it("should return 500 on unexpected error", async () => {
      mockValidateResetToken.mock.mockImplementation(async () => {
        throw new Error("DB error");
      });
      const req = { body: { token: "sometoken" } };
      const res = mockRes();
      await verifyResetToken(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("resetPassword", () => {
    it("should return 400 if token is missing", async () => {
      const req = { body: { newPassword: "password123" } };
      const res = mockRes();
      await resetPassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if newPassword is missing", async () => {
      const req = { body: { token: "tok" } };
      const res = mockRes();
      await resetPassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if password is shorter than 8 characters", async () => {
      const req = { body: { token: "tok", newPassword: "short" } };
      const res = mockRes();
      await resetPassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if token is invalid or expired", async () => {
      mockValidateResetToken.mock.mockImplementation(async () => null);
      const req = { body: { token: "badtok", newPassword: "validpassword" } };
      const res = mockRes();
      await resetPassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 404 if user is not found after token validation", async () => {
      mockValidateResetToken.mock.mockImplementation(async () => ({
        userId: "user1",
        isUsed: false,
        save: mock.fn(async () => {}),
      }));
      mockUserFindById.mock.mockImplementation(async () => null);
      const req = { body: { token: "tok", newPassword: "validpassword" } };
      const res = mockRes();
      await resetPassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should hash and update the password and mark the token as used", async () => {
      const resetToken = {
        userId: "user1",
        isUsed: false,
        save: mock.fn(async () => {}),
      };
      mockValidateResetToken.mock.mockImplementation(async () => resetToken);
      const user = {
        password: "old_hash",
        save: mock.fn(async () => {}),
      };
      mockUserFindById.mock.mockImplementation(async () => user);
      const req = { body: { token: "validtok", newPassword: "newvalidpassword" } };
      const res = mockRes();
      await resetPassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.notStrictEqual(user.password, "old_hash");
      assert.strictEqual(resetToken.isUsed, true);
      assert.strictEqual(user.save.mock.calls.length, 1);
      assert.strictEqual(resetToken.save.mock.calls.length, 1);
    });

    it("should return 500 on unexpected error", async () => {
      mockValidateResetToken.mock.mockImplementation(async () => {
        throw new Error("DB error");
      });
      const req = { body: { token: "tok", newPassword: "validpassword" } };
      const res = mockRes();
      await resetPassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });
});
