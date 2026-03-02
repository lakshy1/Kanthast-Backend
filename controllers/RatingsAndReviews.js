import mongoose from "mongoose";
import RatingAndReview from "../models/ratingAndReview.js";
import Course from "../models/Course.js";

// ====================== CREATE RATING ======================
export const createRating = async (req, res) => {
  try {
    const userId = req.user.id; // assuming auth middleware attaches user
    const { courseId, rating, review } = req.body;

    // Validation
    if (!courseId || !rating || !review) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if user is enrolled in the course
    const courseDetails = await Course.findById(courseId);
    if (!courseDetails) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const isEnrolled = courseDetails.studentsEnrolled.some((studentId) => studentId.toString() === userId);
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: "User not enrolled in this course" });
    }

    // Check if user already reviewed
    const existingReview = await RatingAndReview.findOne({ user: userId, course: courseId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: "User already reviewed this course" });
    }

    // Create rating and review
    const newRating = await RatingAndReview.create({
      user: userId,
      course: courseId,
      rating,
      review,
    });

    // Update course with rating reference
    await Course.findByIdAndUpdate(courseId, {
      $push: { ratingAndReviews: newRating._id },
    });

    return res.status(201).json({
      success: true,
      message: "Rating and review created successfully",
      rating: newRating,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== GET AVERAGE RATING ======================
export const getAverageRating = async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await RatingAndReview.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } },
    ]);

    if (result.length === 0) {
      return res.status(200).json({ success: true, averageRating: 0 });
    }

    return res.status(200).json({
      success: true,
      averageRating: result[0].averageRating,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====================== GET ALL RATINGS ======================
export const getAllRatings = async (req, res) => {
  try {
    const ratings = await RatingAndReview.find({})
      .populate("user", "firstName lastName email")
      .populate("course", "courseName");

    return res.status(200).json({
      success: true,
      message: "All ratings fetched successfully",
      data: ratings,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
