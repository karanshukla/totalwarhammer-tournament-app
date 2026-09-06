import { Resend } from "resend";

import { resendApiKey } from "../config/env.js";

class EmailService {
  /** @type {Resend} */
  #resendClient = null;

  #defaultSender = "TW Tournament Dev <dev@twtournament.app>";

  #defaultRecipient = "dev@twtournament.app";

  // Constructed lazily so a missing RESEND_API_KEY only breaks email-sending
  // paths, not every path that touches EmailService.
  get resendClient() {
    if (!this.#resendClient) {
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is not set in environment variables");
      }
      this.#resendClient = new Resend(resendApiKey);
    }
    return this.#resendClient;
  }

  async sendEmail({
    from = this.#defaultSender,
    to = this.#defaultRecipient,
    subject,
    html,
  }) {
    if (!subject) {
      throw new Error("Email subject is required");
    }

    if (!html) {
      throw new Error("Email must have text or HTML content");
    }

    const message = {
      from,
      to,
      subject,
      html,
    };
    try {
      const { data, error } = await this.resendClient.emails.send(message);
      if (error === null) {
        return {
          success: true,
          messageId: data?.id || null,
        };
      } else {
        return {
          success: false,
          error,
        };
      }
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
}

export default EmailService;
