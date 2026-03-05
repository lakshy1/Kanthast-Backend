import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import OTP from "../models/OTP.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";

const ADMIN_LOGIN_ID = "Admin";
const ADMIN_LOGIN_PASSWORD = "Admin123456789";
const ADMIN_EMAIL = "admin@kanthast.local";

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

export const deactivateUserSubscription = async (req, res) => {
  try {
    const { email, userId } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail && !userId) {
      return res.status(400).json({
        success: false,
        message: "Provide either email or userId",
      });
    }

    const query = normalizedEmail ? { email: normalizedEmail } : { _id: userId };

    const user = await User.findOneAndUpdate(
      query,
      {
        subscriptionPurchased: false,
        subscriptionPurchasedOn: null,
        subscriptionValidTill: null,
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription deactivated successfully",
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionPurchased: user.subscriptionPurchased,
        subscriptionPurchasedOn: user.subscriptionPurchasedOn,
        subscriptionValidTill: user.subscriptionValidTill,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const buildSanitizedUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  contactNumber: user.contactNumber || "",
  accountType: user.accountType,
  image: user.image,
  subscriptionPurchased: Boolean(user.subscriptionPurchased),
  subscriptionPurchasedOn: user.subscriptionPurchasedOn || null,
  subscriptionValidTill: user.subscriptionValidTill || null,
  joinedAt: user.createdAt,
});

const ensureAdminUser = async () => {
  let adminUser = await User.findOne({ email: ADMIN_EMAIL });
  if (adminUser) return adminUser;

  const adminProfile = await Profile.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      email: ADMIN_EMAIL,
      gender: null,
      dateOfBirth: null,
      about: "System administrator account",
      contactNumber: "",
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const randomPassword = await bcrypt.hash(`admin-${Date.now()}`, 10);

  adminUser = await User.create({
    firstName: "Admin",
    lastName: "Account",
    email: ADMIN_EMAIL,
    contactNumber: "",
    password: randomPassword,
    accountType: "Admin",
    additionalDetails: adminProfile._id,
    image: `https://api.dicebear.com/5.x/initials/svg?seed=${encodeURIComponent("Admin Account")}`,
  });

  return adminUser;
};

export const adminLogin = async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (adminId !== ADMIN_LOGIN_ID || password !== ADMIN_LOGIN_PASSWORD) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }

    const adminUser = await ensureAdminUser();
    const token = jwt.sign(
      { id: adminUser._id, accountType: "Admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      token,
      user: buildSanitizedUser(adminUser),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      users: users.map(buildSanitizedUser),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      firstName,
      lastName,
      email,
      contactNumber,
      accountType,
      subscriptionPurchased,
      subscriptionPurchasedOn,
      subscriptionValidTill,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.accountType === "Admin" && String(user._id) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot modify your own admin role through this endpoint",
      });
    }

    const nextEmail = email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== user.email) {
      const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already in use" });
      }
      user.email = nextEmail;
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;

    if (accountType && ["Admin", "Student", "Instructor"].includes(accountType)) {
      user.accountType = accountType;
    }

    if (subscriptionPurchased !== undefined) {
      const purchased = Boolean(subscriptionPurchased);
      user.subscriptionPurchased = purchased;

      if (!purchased) {
        user.subscriptionPurchasedOn = null;
        user.subscriptionValidTill = null;
      } else {
        user.subscriptionPurchasedOn = subscriptionPurchasedOn || user.subscriptionPurchasedOn || new Date();
        user.subscriptionValidTill = subscriptionValidTill || user.subscriptionValidTill || null;
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: buildSanitizedUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    if (String(userId) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot delete own account",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await User.findByIdAndDelete(userId);

    if (user.additionalDetails) {
      await Profile.findByIdAndDelete(user.additionalDetails);
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
