import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import mailSender from "../utils/mailSender.js";

// ====================== RESET PASSWORD TOKEN ======================
export const resetPasswordToken = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Set token and expiry on user document
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset link via email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await mailSender(
      email,
      "Password Reset Request",
      `<p>You requested a password reset.</p>
       <p>Click <a href="${resetUrl}">here</a> to reset your password. 
       This link will expire in 1 hour.</p>`
    );

    return res.status(200).json({ success: true, message: "Password reset link sent to email" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== RESET PASSWORD ======================
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // not expired
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};