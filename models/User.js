import mongoose from "mongoose";

const userSettingsSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      default: "English",
    },
    appearance: {
      type: String,
      enum: ["System", "Light", "Dark"],
      default: "System",
    },
    defaultPlaybackSpeed: {
      type: String,
      default: "1x",
    },
    profileVisibility: {
      type: String,
      enum: ["public", "enrolled", "private"],
      default: "enrolled",
    },
    emailUpdates: {
      type: Boolean,
      default: true,
    },
    learningReminders: {
      type: Boolean,
      default: true,
    },
    courseAnnouncements: {
      type: Boolean,
      default: true,
    },
    subscriptionReminders: {
      type: Boolean,
      default: true,
    },
    productTips: {
      type: Boolean,
      default: false,
    },
    reduceMotion: {
      type: Boolean,
      default: false,
    },
    compactLayout: {
      type: Boolean,
      default: false,
    },
    analyticsSharing: {
      type: Boolean,
      default: true,
    },
    autoplayNextLecture: {
      type: Boolean,
      default: true,
    },
    showProgressPercent: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        fileUrl: {
            type: String,
            default: "",
        },
        fileName: {
            type: String,
            default: "",
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            default: "New Chat",
            trim: true,
        },
        messages: [chatMessageSchema],
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false, timestamps: true }
);

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
    },
    contactNumber: {
        type: String,
        trim: true,
    },
    accountType: {
        type: String,
        enum: ["Admin", "Student", "Instructor"],
    },
    additionalDetails: {
         type: mongoose.Schema.Types.ObjectId,
         required: true,
         ref: "Profile",
    },
    courses: [
        {
            type:mongoose.Schema.Types.ObjectId,
            ref: "Course"
        }
    ],
    image: {
       type:String,
       required: true, 
    },
    courseProgress: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"CourseProgress"
        }
    ],
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },
    subscriptionPurchased: {
        type: Boolean,
        default: false,
    },
    subscriptionPurchasedOn: {
        type: Date,
        default: null,
    },
    subscriptionValidTill: {
        type: Date,
        default: null,
    },
    settings: {
        type: userSettingsSchema,
        default: () => ({}),
    },
    chatHistory: [
        chatMessageSchema,
    ],
    chatSessions: [chatSessionSchema],

}, { timestamps: true });

export default mongoose.model("User", userSchema);
