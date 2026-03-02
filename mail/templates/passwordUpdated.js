export const passwordUpdateTemplate = (userName) => {
  return `
  <html>
    <body style="font-family: Arial, sans-serif; background-color:#f9f9f9; padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:20px; text-align:center; background:#FF9800; color:#fff; border-radius:8px 8px 0 0;">
            <h2 style="margin:0;">Password Updated</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:20px; color:#333;">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your account password has been updated successfully.</p>
            <p>If you did not perform this action, please reset your password immediately and contact support.</p>
            <p style="margin-top:20px;">Stay secure,<br/><strong>The Team</strong></p>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};