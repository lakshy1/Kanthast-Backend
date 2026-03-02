export const emailVerificationTemplate = (userName, otp) => {
  const safeName = userName || "there";

  return `
  <html>
    <body style="margin:0; padding:24px; background-color:#f3f4f6; font-family:Arial, sans-serif; color:#111827;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
        <tr>
          <td style="padding:18px 24px; background:#111827; color:#ffffff; text-align:center;">
            <h2 style="margin:0; font-size:20px; letter-spacing:0.5px;">Kanthast</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            <p style="margin:0 0 12px 0; font-size:15px;">Hi <strong>${safeName}</strong>,</p>
            <p style="margin:0 0 20px 0; font-size:15px; line-height:1.6;">
              Use the one-time password below to verify your email address.
            </p>

            <div style="text-align:center; margin:0 0 18px 0;">
              <span style="display:inline-block; padding:14px 30px; border:1px solid #d1d5db; border-radius:10px; background:#f9fafb; font-size:30px; font-weight:700; letter-spacing:8px; color:#111827;">
                ${otp}
              </span>
            </div>

            <p style="margin:0; font-size:12px; color:#6b7280; text-align:center;">
              OTP expires in 5 minutes. Please do not share this code with anyone.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#6b7280;">
            This is an automated email from Kanthast.
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};
