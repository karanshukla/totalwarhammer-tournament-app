import { Resend } from "resend";

// Initialize Resend with API key
const resend =
  new Resend(process.env.RESEND_API_KEY) ??
  console.error("Resend API key is not set");

class EmailService {
  /**
   * Default sender email address
   * @type {string}
   */
  #defaultSender = "TW Tournament Dev <dev@twtournament.app>";

  /**
   * Default recipient email address (for testing)
   * @type {string}
   */
  #defaultRecipient = "dev@twtournament.app";

  /**
   * Sends an email using Resend
   * @param {string} options.to - Recipient email address
   * @param {string} options.from - Sender email address
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @returns {Promise<Object>} - Promise representing the email sending operation
   */
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
      const response = await resend.emails.send(message);
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

export default EmailService;
