import mailSender from "../utils/mailSender.js";
import { contactMessageTemplate, contactAutoReplyTemplate } from "../mail/templates/contactMessage.js";

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: "Name, email and message are required." });
    }

    const supportEmail = process.env.MAIL_FROM || process.env.MAIL_USER;
    if (!supportEmail) {
      return res.status(500).json({ success: false, message: "Server mail configuration missing." });
    }

    // Send message to support inbox
    await mailSender(
      supportEmail,
      `Contact Form: ${subject?.trim() || "New message"} — from ${name}`,
      contactMessageTemplate(name.trim(), email.trim(), subject?.trim(), message.trim())
    );

    // Send auto-reply to sender (best-effort — don't fail the request if it errors)
    try {
      await mailSender(email.trim(), "We received your message — Kanthast", contactAutoReplyTemplate(name.trim()));
    } catch {
      // ignore auto-reply failure
    }

    return res.status(200).json({ success: true, message: "Message sent successfully." });
  } catch (err) {
    console.error("Contact form error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to send message. Please try again." });
  }
};
