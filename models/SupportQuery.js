import mongoose from "mongoose";

const supportQuerySchema = new mongoose.Schema(
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
      index: true,
    },
    sessionTitle: {
      type: String,
      default: "New Chat",
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      default: "",
      trim: true,
    },
    fileName: {
      type: String,
      default: "",
      trim: true,
    },
    issueType: {
      type: String,
      enum: ["attachment_only", "interface_issue", "general"],
      default: "general",
    },
    source: {
      type: String,
      default: "chatbot",
      trim: true,
    },
    conversationSnapshot: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"],
        },
        content: String,
        fileUrl: String,
        fileName: String,
        createdAt: Date,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("SupportQuery", supportQuerySchema);
