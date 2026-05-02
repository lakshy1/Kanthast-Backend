export const contactMessageTemplate = (name, email, subject, message) => `
<html>
  <body style="margin:0; padding:24px; background-color:#f3f4f6; font-family:Arial, sans-serif; color:#111827;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
      <tr>
        <td style="padding:18px 24px; background:#111827; color:#ffffff; text-align:center;">
          <h2 style="margin:0; font-size:20px; letter-spacing:0.5px;">Kanthast — New Contact Message</h2>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#6b7280; width:90px;">From</td>
              <td style="padding:6px 0; font-size:14px; color:#111827; font-weight:600;">${name} &lt;${email}&gt;</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#6b7280;">Subject</td>
              <td style="padding:6px 0; font-size:14px; color:#111827; font-weight:600;">${subject || "(no subject)"}</td>
            </tr>
          </table>
          <hr style="border:none; border-top:1px solid #e5e7eb; margin:18px 0;" />
          <p style="margin:0; font-size:15px; line-height:1.7; color:#1f2937; white-space:pre-wrap;">${message}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#6b7280;">
          Sent via the Kanthast contact form &mdash; reply directly to ${email}
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const contactAutoReplyTemplate = (name) => `
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
          <p style="margin:0 0 12px 0; font-size:15px;">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6;">
            Thanks for reaching out! We've received your message and will get back to you within 1–2 business days.
          </p>
          <p style="margin:0; font-size:15px; line-height:1.6; color:#6b7280;">
            — The Kanthast Team
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#6b7280;">
          This is an automated confirmation from Kanthast.
        </td>
      </tr>
    </table>
  </body>
</html>
`;
