import express from "express";
import { getProfile, updateProfile } from "../controllers/Profile.js";
import { auth } from "../middleware/Auth.js";

const router = express.Router();

router.get("/", auth, getProfile);
router.put("/", auth, updateProfile);

export default router;