import Profile from "../models/Profile.js";
import User from "../models/User.js";
import UserSession from "../models/UserSession.js";
import {
  buildSessionPayload,
  revokeOtherSessions,
  revokeSessionById,
} from "../utils/sessionManager.js";

const defaultSettings = {
  language: "English",
  appearance: "System",
  defaultPlaybackSpeed: "1x",
  profileVisibility: "enrolled",
  emailUpdates: true,
  learningReminders: true,
  courseAnnouncements: true,
  subscriptionReminders: true,
  productTips: false,
  reduceMotion: false,
  compactLayout: false,
  analyticsSharing: true,
  autoplayNextLecture: true,
  showProgressPercent: true,
};

const normalizeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...(settings || {}),
});

const settingKeys = Object.keys(defaultSettings);

const sanitizeSettingsPayload = (payload = {}) =>
  settingKeys.reduce((acc, key) => {
    if (payload[key] !== undefined) {
      acc[key] = payload[key];
    }
    return acc;
  }, {});

const buildUserPayload = (userDetails) => ({
  _id: userDetails._id,
  firstName: userDetails.firstName,
  lastName: userDetails.lastName,
  email: userDetails.email,
  accountType: userDetails.accountType,
  contactNumber: userDetails.contactNumber,
  image: userDetails.image,
  subscriptionPurchased: Boolean(userDetails.subscriptionPurchased),
  subscriptionPurchasedOn: userDetails.subscriptionPurchasedOn || null,
  subscriptionValidTill: userDetails.subscriptionValidTill || null,
  joinedAt: userDetails.createdAt,
  settings: normalizeSettings(userDetails.settings),
});

// ====================== UPDATE PROFILE ======================
export const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      gender,
      dateOfBirth,
      about,
      contactNumber,
    } = req.body;
    const userId = req.user.id; // assuming auth middleware attaches user

    // Validation
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // Find user and profile
    const userDetails = await User.findById(userId).populate("additionalDetails");
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const nextEmail = email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== userDetails.email) {
      const existingUser = await User.findOne({ email: nextEmail, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(409).json({ success: false, message: "Email already in use" });
      }
    }

    const profileId = userDetails.additionalDetails?._id || userDetails.additionalDetails;
    const profileUpdate = {};

    if (gender !== undefined) profileUpdate.gender = gender || null;
    if (dateOfBirth !== undefined) profileUpdate.dateOfBirth = dateOfBirth || null;
    if (about !== undefined) profileUpdate.about = about || null;
    if (contactNumber !== undefined) profileUpdate.contactNumber = contactNumber || "";
    if (nextEmail) profileUpdate.email = nextEmail;

    let updatedProfile = null;
    if (profileId) {
      updatedProfile = await Profile.findByIdAndUpdate(profileId, profileUpdate, { new: true });
    } else {
      updatedProfile = await Profile.create({
        email: nextEmail || userDetails.email,
        gender: profileUpdate.gender ?? null,
        dateOfBirth: profileUpdate.dateOfBirth ?? null,
        about: profileUpdate.about ?? null,
        contactNumber: profileUpdate.contactNumber ?? (userDetails.contactNumber || ""),
      });
      userDetails.additionalDetails = updatedProfile._id;
    }

    if (firstName !== undefined) userDetails.firstName = String(firstName).trim() || userDetails.firstName;
    if (lastName !== undefined) userDetails.lastName = String(lastName).trim() || userDetails.lastName;
    if (contactNumber !== undefined) userDetails.contactNumber = String(contactNumber).trim();
    if (nextEmail) userDetails.email = nextEmail;
    await userDetails.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedProfile,
      user: buildUserPayload(userDetails),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== GET PROFILE ======================
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const userDetails = await User.findById(userId).populate("additionalDetails");
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      profile: userDetails.additionalDetails,
      user: buildUserPayload(userDetails),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const purchaseSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planDurationYears, dummyPaymentStatus, dummyPaymentId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    if (![1, 2].includes(Number(planDurationYears))) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan duration. Allowed values: 1 or 2 years.",
      });
    }

    if (dummyPaymentStatus !== "success" || !String(dummyPaymentId || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Dummy payment failed. Please retry the payment flow.",
      });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const now = new Date();
    const baseDate =
      currentUser.subscriptionValidTill && new Date(currentUser.subscriptionValidTill) > now
        ? new Date(currentUser.subscriptionValidTill)
        : now;

    const validTill = new Date(baseDate);
    validTill.setFullYear(validTill.getFullYear() + Number(planDurationYears));

    const userDetails = await User.findByIdAndUpdate(
      userId,
      {
        subscriptionPurchased: true,
        subscriptionPurchasedOn: now,
        subscriptionValidTill: validTill,
      },
      { new: true }
    ).populate("additionalDetails");

    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription activated successfully",
      user: buildUserPayload(userDetails),
      profile: userDetails.additionalDetails || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== DELETE PROFILE ======================
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const userDetails = await User.findById(userId);
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const profileId = userDetails.additionalDetails;

    await Promise.all([
      Profile.findByIdAndDelete(profileId),
      User.findByIdAndDelete(userId),
      UserSession.deleteMany({ user: userId }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProfile = deleteAccount;

// ====================== GET SESSIONS ======================
export const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const currentSessionId = req.authTokenId || req.session?.sessionId || req.session?.tokenId || "";

    const sessions = await UserSession.find({ user: userId })
      .sort({ revokedAt: 1, lastSeenAt: -1, startedAt: -1 })
      .lean();

    const safeSessions = Array.isArray(sessions) ? sessions : [];

    return res.status(200).json({
      success: true,
      message: "Sessions fetched successfully",
      sessions: safeSessions
        .map((session) => {
          try {
            return buildSessionPayload(session, currentSessionId);
          } catch {
            return null;
          }
        })
        .filter(Boolean),
      currentSessionId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== LOGOUT OTHER SESSIONS ======================
export const logoutOtherSessions = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const currentSessionId = req.authTokenId || req.session?.sessionId || req.session?.tokenId;

    if (!currentSessionId) {
      return res.status(400).json({ success: false, message: "Current session not found" });
    }

    await revokeOtherSessions(userId, currentSessionId);

    return res.status(200).json({
      success: true,
      message: "Other sessions logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== LOGOUT SESSION ======================
export const logoutSession = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { sessionId } = req.params;

    const currentSessionId = req.authTokenId || req.session?.sessionId || req.session?.tokenId;
    if (String(sessionId) === String(currentSessionId)) {
      return res.status(400).json({
        success: false,
        message: "Use the logout endpoint for the current session",
      });
    }

    const revoked = await revokeSessionById(userId, sessionId, "manual_logout");
    if (!revoked) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Session logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== UPDATE CURRENT SESSION LOCATION ======================
export const updateCurrentSessionLocation = async (req, res) => {
  try {
    const sessionId = req.authTokenId || req.session?.sessionId || req.session?.tokenId;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Current session not found" });
    }

    const { locationSource = "gps", locationLabel = "GPS location", geo = {} } = req.body || {};
    const latitude = Number.isFinite(Number(geo.latitude)) ? Number(geo.latitude) : null;
    const longitude = Number.isFinite(Number(geo.longitude)) ? Number(geo.longitude) : null;
    const accuracy = Number.isFinite(Number(geo.accuracy)) ? Number(geo.accuracy) : null;

    const update = {
      locationSource: ["gps", "ip", "unknown"].includes(locationSource) ? locationSource : "gps",
      locationLabel: String(locationLabel || "GPS location").trim() || "GPS location",
      geo: { latitude, longitude, accuracy },
      lastSeenAt: new Date(),
    };

    const session = await UserSession.findOneAndUpdate(
      { sessionId, revokedAt: null },
      { $set: update },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Session location updated successfully",
      session: buildSessionPayload(session, sessionId),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== GET SETTINGS ======================
export const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDetails = await User.findById(userId);

    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Settings fetched successfully",
      settings: normalizeSettings(userDetails.settings),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== UPDATE SETTINGS ======================
export const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDetails = await User.findById(userId);

    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const nextSettings = normalizeSettings({
      ...userDetails.settings?.toObject?.(),
      ...sanitizeSettingsPayload(req.body),
    });

    userDetails.settings = nextSettings;
    await userDetails.save();

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings: nextSettings,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
