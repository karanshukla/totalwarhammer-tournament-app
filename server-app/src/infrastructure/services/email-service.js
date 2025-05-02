import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY) ??
  console.error("SendGrid API key is not set");

class EmailService {
  /**
   * Default sender email address
   * @type {string}
   */
  #defaultSender = "anchorstandard@proton.me";

  /**
   * Default recipient email address (for testing)
   * @type {string}
   */
  #defaultRecipient = "anchorstandard@proton.me";

  /**
   * Sends an email using SendGrid
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.from - Sender email address
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   * @returns {Promise<Object>} - Promise representing the email sending operation
   */
  async sendEmail({
    to = this.#defaultRecipient,
    from = this.#defaultSender,
    subject,
    text,
    html,
  }) {
    if (!subject) {
      throw new Error("Email subject is required");
    }

    if (!text && !html) {
      throw new Error("Email must have text or HTML content");
    }

    const msg = {
      to,
      from,
      subject,
      text,
      html,
    };

    try {
      const response = await sgMail.send(msg);
      console.log("Email sent successfully");
      return {
        success: true,
        messageId: response?.[0]?.headers?.["x-message-id"] || null,
      };
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  /**
   * Sends a test email
   * @param {string} [recipient] - Optional test recipient
   * @returns {Promise<Object>} - Promise representing the email sending operation
   */
  sendTestEmail(recipient) {
    return this.sendEmail({
      to: recipient,
      subject: "Sending with SendGrid is Fun",
      text: "and easy to do anywhere, even with Node.js",
      html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    });
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
