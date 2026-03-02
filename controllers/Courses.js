import Course from "../models/Course.js";
import Tag from "../models/Tag.js";
import User from "../models/User.js";
import { uploadImageToCloudinary } from "../utils/imageUploader.js";

// ====================== CREATE COURSE ======================
export const createCourse = async (req, res) => {
  try {
    const { courseName, courseDescription, whatYouWillLearn, price, tag, userId } = req.body;
    const thumbnail = req.files?.thumbnail;

    // Validation
    if (!courseName || !courseDescription || !whatYouWillLearn || !price || !tag || !userId || !thumbnail) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Instructor check
    const instructorDetails = await User.findById(userId);
    if (!instructorDetails) {
      return res.status(404).json({ success: false, message: "Instructor details not found" });
    }

    // Tag check
    const tagDetails = await Tag.findById(tag);
    if (!tagDetails) {
      return res.status(404).json({ success: false, message: "Tag details not found" });
    }

    // Upload thumbnail to Cloudinary
    const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

    // Create course entry
    const newCourse = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn,
      price,
      tag: tagDetails._id,
      thumbnail: thumbnailImage.secure_url,
    });

    // Add course to instructor’s schema
    await User.findByIdAndUpdate(
      { _id: instructorDetails._id },
      { $push: { courses: newCourse._id } },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course: newCourse,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== SHOW ALL COURSES ======================
export const showAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find({})
      .populate("instructor", "firstName lastName email")
      .populate("tag", "name description");

    return res.status(200).json({
      success: true,
      message: "Data for all courses fetched successfully",
      data: allCourses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Cannot fetch course data",
      error: error.message,
    });
  }
};

// ====================== GET COURSE BY ID ======================
export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate("instructor", "firstName lastName email")
      .populate("tag", "name description")
      .populate({
        path: "sections",
        populate: {
          path: "subSections",
        },
      });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Course fetched successfully",
      data: course,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};