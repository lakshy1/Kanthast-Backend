// models/OTP.js
import mongoose from "mongoose";
import mailSender from "../utils/mailSender.js"; // adjust path if needed
import { emailVerificationTemplate } from "../mail/templates/emailVerification.js";

// Function to send verification emails
const sendVerificationEmail = async (email, otp) => {
  try {
    const displayName = email?.split("@")?.[0] || "there";
    const mailResponse = await mailSender(
      email,
      "Your Kanthast verification code",
      emailVerificationTemplate(displayName, otp)
    );
    console.log("Email sent successfully:", mailResponse.messageId);
  } catch (error) {
    console.error("Error occurred while sending mail:", error.message);
    throw error;
  }
};

// Schema definition
const OTPSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 5 * 60, // auto-delete after 5 minutes
    },
  },
  { timestamps: true }
);

// Pre-save hook to send email automatically
// In async middleware, do not use `next()`; throw to signal errors.
OTPSchema.pre("save", async function () {
  await sendVerificationEmail(this.email, this.otp);
});

// ✅ Default export so you can `import OTP from "../models/OTP.js"`
export default mongoose.model("OTP", OTPSchema);
