import { v2 as cloudinary } from "cloudinary";

export const cloudinaryConnect = () => {
  try {
    const cloudName = (
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUD_NAME ||
      ""
    ).trim();
    const apiKey = (
      process.env.CLOUDINARY_API_KEY ||
      process.env.API_KEY ||
      ""
    ).trim();
    const apiSecret = (
      process.env.CLOUDINARY_API_SECRET ||
      process.env.API_SECRET ||
      ""
    ).trim();

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Missing Cloudinary env values. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    console.log("Cloudinary connected successfully");
  } catch (error) {
    console.error("Cloudinary connection failed:", error.message);
  }
};
