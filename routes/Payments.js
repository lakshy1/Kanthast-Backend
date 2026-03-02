import express from "express";
import { capturePayment, verifyPayment } from "../controllers/Payment.js";
import { auth } from "../middleware/Auth.js";

const router = express.Router();

router.post("/capture", auth, capturePayment);
router.post("/verify", auth, verifyPayment);

export default router;
