import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    imageLink: {
      type: String,
      trim: true,
      default: "",
    },
    imageText: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const videoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
      default: "--:--",
    },
    summary: {
      type: String,
      trim: true,
      default: "",
    },
    videoLink: {
      type: String,
      trim: true,
      default: "",
    },
    photos: {
      type: [mediaSchema],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const chapterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    totalDuration: {
      type: String,
      trim: true,
      default: "--:--",
    },
    order: {
      type: Number,
      default: 0,
    },
    videos: {
      type: [videoSchema],
      default: [],
    },
  },
  { _id: true }
);

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    totalDuration: {
      type: String,
      trim: true,
      default: "--:--",
    },
    order: {
      type: Number,
      default: 0,
    },
    chapters: {
      type: [chapterSchema],
      default: [],
    },
  },
  { _id: true }
);

const medicineUsmleSchema = new mongoose.Schema(
  {
    courseKey: {
      type: String,
      trim: true,
      default: "medicine-usmle",
      unique: true,
      index: true,
    },
    courseTitle: {
      type: String,
      trim: true,
      default: "Medicine/USMLE",
    },
    subjects: {
      type: [subjectSchema],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const MedicineUSMLE = mongoose.model("MedicineUSMLE", medicineUsmleSchema);

export default MedicineUSMLE;
