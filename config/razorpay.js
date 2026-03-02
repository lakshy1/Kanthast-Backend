import dotenv from "dotenv";
import Razorpay from "razorpay";

dotenv.config();

const hasRazorpayConfig = Boolean(process.env.RAZORPAY_KEY && process.env.RAZORPAY_SECRET);

export const instance = hasRazorpayConfig
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY,
      key_secret: process.env.RAZORPAY_SECRET,
    })
  : null;
