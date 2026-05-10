/**
 * Password reset email template
 * @param {string} resetLink - The password reset link
 * @returns {Object} - Email content with text and HTML versions
 */
export const createPasswordResetEmail = (resetLink) => {
  const year = new Date().getFullYear();
  return {
    subject: "Reset your password — TW Tournament",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:Arial,Helvetica,sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" style="max-width:560px;background-color:#1a1a1a;border-radius:8px;border:1px solid #2e2e2e;overflow:hidden;">

          <!-- Header bar -->
          <tr>
            <td style="background-color:#7c0000;padding:24px 32px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f0c060;">Total War: Warhammer</p>
              <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Tournament App</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Password Reset Request</h2>
              <p style="margin:0 0 12px;font-size:15px;color:#b0b0b0;line-height:1.6;">
                We received a request to reset the password for your account. Click the button below to choose a new password.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#b0b0b0;line-height:1.6;">
                This link will expire in <strong style="color:#e0e0e0;">1 hour</strong>.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="border-radius:6px;background-color:#c0392b;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;letter-spacing:0.5px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;font-size:13px;color:#808080;">If the button doesn't work, paste this link into your browser:</p>
              <p style="margin:0 0 28px;font-size:12px;word-break:break-all;">
                <a href="${resetLink}" style="color:#a0c4ff;text-decoration:underline;">${resetLink}</a>
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #2e2e2e;margin:0 0 20px;">

              <p style="margin:0;font-size:13px;color:#606060;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not change.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#141414;padding:16px 32px;border-top:1px solid #2e2e2e;">
              <p style="margin:0;font-size:12px;color:#505050;text-align:center;">
                &copy; ${year} TW Tournament App &nbsp;&middot;&nbsp;
                <a href="https://twtournament.app" style="color:#606060;text-decoration:none;">twtournament.app</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`,
  };
};
