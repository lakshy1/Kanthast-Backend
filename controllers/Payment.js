import crypto from "crypto";
import { instance } from "../config/razorpay.js";
import { courseEnrollmentTemplate } from "../mail/templates/courseEnrollment.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import mailSender from "../utils/mailSender.js";

export const capturePayment = async (req, res) => {
  try {
    if (!instance) {
      return res.status(500).json({ success: false, message: "Razorpay is not configured on the server" });
    }

    const { courseId } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!courseId || !userId) {
      return res.status(400).json({ success: false, message: "Missing properties" });
    }

    const courseDetails = await Course.findById(courseId);
    if (!courseDetails) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const userDetails = await User.findById(userId);
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const alreadyEnrolled = userDetails.courses.some((course) => course.toString() === courseId);
    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, message: "User already enrolled in this course" });
    }

    const order = await instance.orders.create({
      amount: courseDetails.price * 100,
      currency: "INR",
      receipt: `receipt_${courseId}_${userId}`,
    });

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      order,
      course: courseDetails,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    if (!instance) {
      return res.status(500).json({ success: false, message: "Razorpay is not configured on the server" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId || !userId) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const courseDetails = await Course.findById(courseId);
    const userDetails = await User.findById(userId);
    if (!courseDetails || !userDetails) {
      return res.status(404).json({ success: false, message: "Course or user not found" });
    }

    const alreadyEnrolled = userDetails.courses.some((course) => course.toString() === courseId);
    if (alreadyEnrolled) {
      return res.status(200).json({ success: true, message: "User already enrolled", course: courseDetails });
    }

    const enrolledCourse = await Course.findByIdAndUpdate(
      courseId,
      { $push: { studentsEnrolled: userId } },
      { new: true }
    );
    await User.findByIdAndUpdate(userId, { $push: { courses: courseId } }, { new: true });

    await mailSender(
      userDetails.email,
      "Course Enrollment Confirmation",
      courseEnrollmentTemplate(userDetails.firstName, enrolledCourse.courseName)
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified and course enrollment successful",
      course: enrolledCourse,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
