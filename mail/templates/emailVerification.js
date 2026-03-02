export const emailVerificationTemplate = (userName, otp) => {
  return `
  <html>
    <body style="font-family: Arial, sans-serif; background-color:#f9f9f9; padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:20px; text-align:center; background:#2196F3; color:#fff; border-radius:8px 8px 0 0;">
            <h2 style="margin:0;">Email Verification</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:20px; color:#333;">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Please use the following OTP to verify your email address:</p>
            <div style="margin:20px auto; text-align:center;">
              <span style="display:inline-block; background:#eee; padding:15px 30px; font-size:24px; font-weight:bold; border-radius:6px; letter-spacing:2px; color:#2c3e50;">
                ${otp}
              </span>
            </div>
            <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
            <p style="margin-top:20px;">Thanks,<br/><strong>The Team</strong></p>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};