import express from "express";
import {
  getProfile,
  purchaseSubscription,
  updateProfile,
} from "../controllers/Profile.js";
import { auth } from "../middleware/Auth.js";

const router = express.Router();

router.get("/", auth, getProfile);
router.put("/", auth, updateProfile);
router.put("/subscription", auth, purchaseSubscription);

export default router;
