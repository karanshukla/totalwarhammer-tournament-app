/**
 * Branch coverage for infrastructure/email-templates/password-reset-template.js:
 * - createPasswordResetEmail(resetLink) → returns { subject, html } with link embedded
 * - html contains the current year
 */
import assert from "node:assert";
import { describe, it } from "node:test";
import { createPasswordResetEmail } from "../infrastructure/email-templates/password-reset-template.js";

describe("createPasswordResetEmail", () => {
  const RESET_LINK = "https://example.com/reset?token=abc123";

  it("returns an object with subject and html properties", () => {
    const result = createPasswordResetEmail(RESET_LINK);
    assert.ok(result.subject);
    assert.ok(result.html);
  });

  it("subject contains 'Reset'", () => {
    const { subject } = createPasswordResetEmail(RESET_LINK);
    assert.ok(subject.toLowerCase().includes("reset"));
  });

  it("html contains the reset link", () => {
    const { html } = createPasswordResetEmail(RESET_LINK);
    assert.ok(html.includes(RESET_LINK));
  });

  it("html contains the current year", () => {
    const year = String(new Date().getFullYear());
    const { html } = createPasswordResetEmail(RESET_LINK);
    assert.ok(html.includes(year));
  });

  it("html contains 'Reset Password' call-to-action text", () => {
    const { html } = createPasswordResetEmail(RESET_LINK);
    assert.ok(html.includes("Reset Password"));
  });
});
