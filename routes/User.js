import express from "express";
import { login, sendOTP, signUp, changePassword } from "../controllers/Auth.js";
import { auth } from "../middleware/Auth.js";
import { resetPassword, resetPasswordToken } from "../controllers/ResetPassword.js";

const router = express.Router();

// Example routes
router.post("/sendotp", sendOTP);
router.post("/signup", signUp);
router.post("/login", login);
router.post("/change-password", auth, changePassword);
router.post("/reset-password-token", resetPasswordToken);
router.post("/reset-password", resetPassword);

export default router;
