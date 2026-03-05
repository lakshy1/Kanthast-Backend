// config/database.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    console.log("Mongo URL Used:", process.env.MONGODB_URL);
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("DB Connected Successfully");
    console.log("Mongo DB Name:", mongoose.connection.name);
  } catch (err) {
    console.log("Mongo URL Used:", process.env.MONGODB_URL);
    console.error("DB Connection Failed:", err.message);
    process.exit(1);
  }
};
