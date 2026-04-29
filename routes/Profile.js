import express from "express";
import {
  deleteAccount,
  getProfile,
  getSettings,
  getActiveSessions,
  purchaseSubscription,
  logoutOtherSessions,
  logoutSession,
  updateCurrentSessionLocation,
  updateProfile,
  updateSettings,
} from "../controllers/Profile.js";
import { auth } from "../middleware/Auth.js";

const router = express.Router();

router.get("/", auth, getProfile);
router.get("/settings", auth, getSettings);
router.get("/sessions", auth, getActiveSessions);
router.put("/", auth, updateProfile);
router.put("/settings", auth, updateSettings);
router.put("/subscription", auth, purchaseSubscription);
router.put("/sessions/other/logout", auth, logoutOtherSessions);
router.put("/sessions/location", auth, updateCurrentSessionLocation);
router.delete("/sessions/:sessionId", auth, logoutSession);
router.delete("/account", auth, deleteAccount);

export default router;
