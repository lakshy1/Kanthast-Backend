import express from "express";
import { createCourse, getAllCourses } from "../controllers/Course.js";
import { auth, isInstructor } from "../middleware/Auth.js";

const router = express.Router();

router.post("/", auth, isInstructor, createCourse);
router.get("/", getAllCourses);

export default router;
