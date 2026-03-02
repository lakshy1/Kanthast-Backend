import dotenv from "dotenv";
dotenv.config();

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const mailSender = async (email, title, body) => {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY || process.env.MAIL_PASS;
    const fromEmail = process.env.MAIL_FROM || process.env.MAIL_USER;

    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY is missing");
    }

    if (!fromEmail) {
      throw new Error("MAIL_FROM (or MAIL_USER) is missing");
    }

    const payload = {
      sender: {
        email: fromEmail,
        name: process.env.MAIL_FROM_NAME || "Kanthast",
      },
      to: [{ email }],
      subject: title,
      htmlContent: body,
    };

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseBody?.message || `Brevo request failed with status ${response.status}`);
    }

    const info = {
      messageId: responseBody?.messageId || responseBody?.requestId || null,
      raw: responseBody,
    };

    console.log("Email sent:", info.messageId || "ok");
    return info;
  } catch (error) {
    console.error("Error sending mail:", error.message);
    throw error;
  }
};

export default mailSender;
