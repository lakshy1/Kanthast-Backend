import Course from "../models/Course.js";
import Tag from "../models/Tag.js";
import User from "../models/User.js";
import { uploadImageToCloudinary } from "../utils/imageUploader.js";

export const createCourse = async (req, res) => {
  try {
    const { courseName, courseDescription, whatYouWillLearn, price, tag } = req.body;
    const thumbnail = req.files?.thumbnail;
    const instructorId = req.user?.id || req.user?._id;

    if (!courseName || !courseDescription || !whatYouWillLearn || !price || !tag || !thumbnail) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const instructorDetails = await User.findById(instructorId);
    if (!instructorDetails || instructorDetails.accountType !== "Instructor") {
      return res.status(403).json({ success: false, message: "Only instructors can create courses" });
    }

    const tagDetails = await Tag.findById(tag);
    if (!tagDetails) {
      return res.status(404).json({ success: false, message: "Tag not found" });
    }

    const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

    const newCourse = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn,
      price,
      tag: tagDetails._id,
      thumbnail: thumbnailImage.secure_url,
    });

    await User.findByIdAndUpdate(instructorDetails._id, { $push: { courses: newCourse._id } }, { new: true });

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course: newCourse,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find({})
      .populate("instructor", "firstName lastName email")
      .populate("tag", "name description");

    return res.status(200).json({
      success: true,
      message: "All courses fetched successfully",
      data: allCourses,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course ID is required" });
    }

    const courseDetails = await Course.findById(courseId)
      .populate({
        path: "instructor",
        select: "firstName lastName email",
      })
      .populate("tag", "name description")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .populate("ratingAndReviews");

    if (!courseDetails) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Course details fetched successfully",
      data: courseDetails,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
