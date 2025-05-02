/**
 * Password reset email template
 * @param {string} resetLink - The password reset link
 * @returns {Object} - Email content with text and HTML versions
 */
export const createPasswordResetEmail = (resetLink) => {
  return {
    subject: "Password Reset Request - Total War Warhammer Tournament App",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport", initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.5;
              color: #000;
              max-width: 600px;
              margin: 0 auto;
              padding: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
            }
            .button {
              display: inline-block;
              background-color: #000;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 4px;
              margin: 15px 0;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Total War Warhammer Tournament App</h1>
          </div>
          
          <p>Hello,</p>
          <p>We received a request to reset your password. To reset your password, click the button below:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          
          <p><em>If you didn't request a password reset, please ignore this email.</em></p>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Total War Warhammer Tournament App</p>
          </div>
        </body>
      </html>
    `,
  };
};
