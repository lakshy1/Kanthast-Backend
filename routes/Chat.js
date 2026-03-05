import express from "express";
import { auth } from "../middleware/Auth.js";
import { chatRateLimit } from "../middleware/ChatRateLimit.js";
import {
  createChatSession,
  deleteChatSession,
  getChatHistory,
  sendChatMessage,
  uploadChatFile,
} from "../controllers/Chat.js";

const router = express.Router();

router.get("/history", auth, getChatHistory);
router.post("/session/new", auth, createChatSession);
router.delete("/session/:sessionId", auth, deleteChatSession);
router.post("/send", auth, chatRateLimit, sendChatMessage);
router.post("/upload", auth, uploadChatFile);

export default router;
