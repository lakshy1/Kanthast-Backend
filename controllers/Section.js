import Section from "../models/Section.js";
import Course from "../models/Course.js";

// ====================== CREATE SECTION ======================
export const createSection = async (req, res) => {
  try {
    const { sectionName, courseId } = req.body;

    if (!sectionName || !courseId) {
      return res.status(400).json({ success: false, message: "Missing properties" });
    }

    // Create section
    const newSection = await Section.create({ sectionName });

    // Add section to course
    await Course.findByIdAndUpdate(courseId, {
      $push: { courseContent: newSection._id },
    });

    return res.status(201).json({
      success: true,
      message: "Section created and added to course",
      section: newSection,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== UPDATE SECTION ======================
export const updateSection = async (req, res) => {
  try {
    const { sectionId, sectionName } = req.body;

    if (!sectionId || !sectionName) {
      return res.status(400).json({ success: false, message: "Missing properties" });
    }

    const updatedSection = await Section.findByIdAndUpdate(
      sectionId,
      { sectionName },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Section updated successfully",
      section: updatedSection,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== DELETE SECTION ======================
export const deleteSection = async (req, res) => {
  try {
    const { sectionId, courseId } = req.body;

    if (!sectionId || !courseId) {
      return res.status(400).json({ success: false, message: "Missing properties" });
    }

    // Remove section from course
    await Course.findByIdAndUpdate(courseId, {
      $pull: { courseContent: sectionId },
    });

    // Delete section
    await Section.findByIdAndDelete(sectionId);

    return res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== GET SECTION BY ID ======================
export const getSectionById = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await Section.findById(sectionId).populate("subSection");

    if (!section) {
      return res.status(404).json({ success: false, message: "Section not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Section fetched successfully",
      section,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};