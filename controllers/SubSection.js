import SubSection from "../models/subSection.js";
import Section from "../models/Section.js";
import { uploadImageToCloudinary } from "../utils/imageUploader.js";

// ====================== CREATE SUBSECTION ======================
export const createSubSection = async (req, res) => {
  try {
    const { sectionId, title, timeDuration, description } = req.body;
    const video = req.files?.videoFile;

    // Validation
    if (!sectionId || !title || !timeDuration || !description || !video) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Upload video to Cloudinary
    const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);

    // Create subsection
    const newSubSection = await SubSection.create({
      title,
      timeDuration,
      description,
      videoUrl: uploadDetails.secure_url,
    });

    // Add subsection to section
    await Section.findByIdAndUpdate(sectionId, {
      $push: { subSection: newSubSection._id },
    });

    return res.status(201).json({
      success: true,
      message: "SubSection created successfully",
      subSection: newSubSection,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== UPDATE SUBSECTION ======================
export const updateSubSection = async (req, res) => {
  try {
    const { subSectionId, title, timeDuration, description } = req.body;

    if (!subSectionId) {
      return res.status(400).json({ success: false, message: "SubSection ID is required" });
    }

    const updatedSubSection = await SubSection.findByIdAndUpdate(
      subSectionId,
      { title, timeDuration, description },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "SubSection updated successfully",
      subSection: updatedSubSection,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== DELETE SUBSECTION ======================
export const deleteSubSection = async (req, res) => {
  try {
    const { subSectionId, sectionId } = req.body;

    if (!subSectionId || !sectionId) {
      return res.status(400).json({ success: false, message: "Missing properties" });
    }

    // Remove subsection from section
    await Section.findByIdAndUpdate(sectionId, {
      $pull: { subSection: subSectionId },
    });

    // Delete subsection
    await SubSection.findByIdAndDelete(subSectionId);

    return res.status(200).json({
      success: true,
      message: "SubSection deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== GET SUBSECTION BY ID ======================
export const getSubSectionById = async (req, res) => {
  try {
    const { subSectionId } = req.params;

    const subSection = await SubSection.findById(subSectionId);

    if (!subSection) {
      return res.status(404).json({ success: false, message: "SubSection not found" });
    }

    return res.status(200).json({
      success: true,
      message: "SubSection fetched successfully",
      subSection,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
