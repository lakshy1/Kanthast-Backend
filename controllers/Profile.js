import Profile from "../models/Profile.js";
import User from "../models/User.js";

// ====================== UPDATE PROFILE ======================
export const updateProfile = async (req, res) => {
  try {
    const { gender, dateOfBirth, about, contactNumber } = req.body;
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

    const profileId = userDetails.additionalDetails?._id || userDetails.additionalDetails;
    const updatedProfile = await Profile.findByIdAndUpdate(
      profileId,
      { gender, dateOfBirth, about, contactNumber },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedProfile,
      user: {
        _id: userDetails._id,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        email: userDetails.email,
        accountType: userDetails.accountType,
        contactNumber: userDetails.contactNumber,
        image: userDetails.image,
        joinedAt: userDetails.createdAt,
      },
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
      user: {
        _id: userDetails._id,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        email: userDetails.email,
        accountType: userDetails.accountType,
        contactNumber: userDetails.contactNumber,
        image: userDetails.image,
        joinedAt: userDetails.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== DELETE PROFILE ======================
export const deleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const userDetails = await User.findById(userId);
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const profileId = userDetails.additionalDetails;

    // Delete profile
    await Profile.findByIdAndDelete(profileId);

    // Remove reference from user
    userDetails.additionalDetails = undefined;
    await userDetails.save();

    return res.status(200).json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
