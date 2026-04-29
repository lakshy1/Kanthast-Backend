import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceName: {
      type: String,
      default: "Unknown device",
    },
    browserName: {
      type: String,
      default: "Unknown browser",
    },
    browserVersion: {
      type: String,
      default: "",
    },
    osName: {
      type: String,
      default: "Unknown OS",
    },
    platform: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    locationSource: {
      type: String,
      enum: ["gps", "ip", "unknown"],
      default: "unknown",
    },
    locationLabel: {
      type: String,
      default: "Unknown",
    },
    geo: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
      accuracy: {
        type: Number,
        default: null,
      },
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      default: "",
    },
    revokedBySessionId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, revokedAt: 1, lastSeenAt: -1 });

export default mongoose.model("UserSession", sessionSchema);
