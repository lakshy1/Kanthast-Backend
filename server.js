// server.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import dotenv from "dotenv";

import { connectDB } from "./config/database.js";
import { cloudinaryConnect } from "./config/cloudinary.js";

// Route imports
import userRoutes from "./routes/User.js";
import profileRoutes from "./routes/Profile.js";
import paymentRoutes from "./routes/Payments.js";
import courseRoutes from "./routes/Course.js";
import chatRoutes from "./routes/Chat.js";
import medicineUsmleRoutes from "./routes/MedicineUSMLE.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Database connection
(async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
})();

// Middlewares
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : []),
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// Cloudinary connection
cloudinaryConnect();

// Routes
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/medicine-usmle", medicineUsmleRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("🚀 Server is running successfully!");
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
