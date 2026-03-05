import express from "express";
import {
  adminLogin,
  changePassword,
  deactivateUserSubscription,
  deleteUserByAdmin,
  getAllUsersForAdmin,
  login,
  sendOTP,
  signUp,
  updateUserByAdmin,
} from "../controllers/Auth.js";
import { auth, isAdmin } from "../middleware/Auth.js";
import { resetPassword, resetPasswordToken } from "../controllers/ResetPassword.js";

const router = express.Router();

// Example routes
router.post("/sendotp", sendOTP);
router.post("/signup", signUp);
router.post("/login", login);
router.post("/admin-login", adminLogin);
router.post("/change-password", auth, changePassword);
router.put("/subscription/deactivate", auth, isAdmin, deactivateUserSubscription);
router.get("/admin/users", auth, isAdmin, getAllUsersForAdmin);
router.put("/admin/users/:userId", auth, isAdmin, updateUserByAdmin);
router.delete("/admin/users/:userId", auth, isAdmin, deleteUserByAdmin);
router.post("/reset-password-token", resetPasswordToken);
router.post("/reset-password", resetPassword);

export default router;
