import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import OTP from "../models/OTP.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already registered" });
    }

    // Keep only the newest OTP relevant for verification.
    await OTP.deleteMany({ email: normalizedEmail });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ email: normalizedEmail, otp });

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const signUp = async (req, res) => {
  try {
    // Signup now uses a single password input from the client.
    // `confirmPassword` is intentionally removed from required flow.
    const { firstName, lastName, email, contactNumber, password, accountType, otp } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedOtp = String(otp || "").trim();

    if (
      !firstName ||
      !lastName ||
      !normalizedEmail ||
      !password ||
      !accountType ||
      !normalizedOtp
    ) {
      return res.status(400).json({ success: false, message: "All required fields must be provided" });
    }

    if (!["Student", "Instructor"].includes(accountType)) {
      return res.status(400).json({ success: false, message: "Invalid account type" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already registered" });
    }

    const recentOTP = await OTP.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (!recentOTP || recentOTP.otp !== normalizedOtp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profileDetails = await Profile.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        gender: null,
        dateOfBirth: null,
        about: null,
        contactNumber: contactNumber || "",
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      contactNumber: contactNumber || "",
      password: hashedPassword,
      accountType,
      additionalDetails: profileDetails._id,
      image: `https://api.dicebear.com/5.x/initials/svg?seed=${encodeURIComponent(
        `${firstName} ${lastName}`
      )}`,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accountType: user.accountType,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).populate("additionalDetails");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, accountType: user.accountType }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;

    return res.status(200).json({ success: true, token, user: sanitizedUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    if (!userId || !oldPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: "New password and confirm password do not match" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid old password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
