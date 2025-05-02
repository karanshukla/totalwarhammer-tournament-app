/**
 * Password reset email template
 * @param {string} resetLink - The password reset link
 * @returns {Object} - Email content with text and HTML versions
 */
export const createPasswordResetEmail = (resetLink) => {
  return {
    subject: "Password Reset Request - Total War Warhammer Tournament App",
    text: `You have requested to reset your password for the Total War Warhammer Tournament App. Click the link to reset your password: ${resetLink}. If you did not request this, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #000;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .email-container {
              border: 1px solid #222;
              border-radius: 5px;
              padding: 20px;
              background-color: #fff;
            }
            .header {
              text-align: center;
              padding-bottom: 15px;
              border-bottom: 1px solid #222;
              margin-bottom: 20px;
            }
            .header h1 {
              color: #000;
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 10px 0;
            }
            .button {
              display: inline-block;
              background-color: #000;
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 4px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #222;
              font-size: 12px;
              color: #333;
              text-align: center;
            }
            .note {
              font-size: 13px;
              color: #333;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>Total War Warhammer Tournament App</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password for your Total War Warhammer Tournament App account. To reset your password, click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
              <p style="word-break: break-all;"><a href="${resetLink}" style="color: #000;">${resetLink}</a></p>
              
              <p class="note">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Total War Warhammer Tournament App. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
};
