import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import User from "../models/User.js";
import VideoGeneration from "../models/VideoGeneration.js";
import {
  buildVideoLecturePackage,
  getVideoAssetPathByKey,
} from "../services/videoLectureService.js";

const CHAT_HISTORY_LIMIT = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isSchoolUser = (user) => String(user?.track || "").toLowerCase() === "school";

const buildSessionTitle = (text = "") => {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "New Chat";
  return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean;
};

const createEmptySession = () => {
  const now = new Date();
  return {
    sessionId: crypto.randomUUID(),
    title: "New Chat",
    messages: [],
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  };
};

const ensureChatSessionsInitialized = async (user) => {
  user.chatSessions = user.chatSessions || [];
  if (user.chatSessions.length > 0) return false;

  if ((user.chatHistory || []).length > 0) {
    const migratedMessages = user.chatHistory
      .filter((item) => item?.role && item?.content)
      .map((item) => ({
        role: item.role,
        content: item.content,
        mediaType: item.mediaType || "",
        mediaUrl: item.mediaUrl || "",
        thumbnailUrl: item.thumbnailUrl || "",
        topic: item.topic || "",
        caption: item.caption || "",
        fileUrl: item.fileUrl || "",
        fileName: item.fileName || "",
        createdAt: item.createdAt || new Date(),
      }));

    const firstUserMessage = migratedMessages.find((item) => item.role === "user")?.content || "";

    user.chatSessions.push({
      sessionId: crypto.randomUUID(),
      title: buildSessionTitle(firstUserMessage),
      messages: migratedMessages,
      lastMessageAt: migratedMessages[migratedMessages.length - 1]?.createdAt || new Date(),
    });
  } else {
    user.chatSessions.push(createEmptySession());
  }

  await user.save();
  return true;
};

const getLatestSession = (user) => {
  const sessions = [...(user.chatSessions || [])];
  sessions.sort((a, b) => {
    const aTime = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
  return sessions[0] || null;
};

const ensureSessionForUser = async (user, requestedSessionId = "") => {
  await ensureChatSessionsInitialized(user);
  if (requestedSessionId) {
    const found = (user.chatSessions || []).find((session) => session.sessionId === requestedSessionId);
    if (found) return found;
  }
  const latest = getLatestSession(user);
  if (latest) return latest;
  const session = createEmptySession();
  user.chatSessions.push(session);
  await user.save();
  return session;
};

const toSessionSummary = (session) => ({
  sessionId: session.sessionId,
  title: session.title || "New Chat",
  preview: (session.messages?.[session.messages.length - 1]?.content || "").slice(0, 80),
  messageCount: session.messages?.length || 0,
  lastMessageAt: session.lastMessageAt || session.updatedAt || session.createdAt,
  createdAt: session.createdAt,
});

const normalizeTopic = (value = "") =>
  String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .toLowerCase();

const buildSvgThumbnail = ({ topic, title, primary = "#0ea5e9", accent = "#22c55e" }) => {
  const safeTopic = String(topic || "AI Lecture").replace(/[<>&"]/g, "");
  const safeTitle = String(title || "AI Lecture").replace(/[<>&"]/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" rx="48" fill="url(#bg)" />
      <circle cx="1050" cy="160" r="120" fill="white" fill-opacity="0.16" />
      <circle cx="180" cy="560" r="160" fill="white" fill-opacity="0.12" />
      <rect x="92" y="96" width="1096" height="528" rx="36" fill="#030712" fill-opacity="0.24" stroke="white" stroke-opacity="0.22" />
      <text x="120" y="190" fill="white" font-size="38" font-family="Arial, sans-serif" font-weight="700">AI Lecture</text>
      <text x="120" y="278" fill="white" font-size="72" font-family="Arial, sans-serif" font-weight="800">${safeTitle}</text>
      <text x="120" y="360" fill="rgba(255,255,255,0.88)" font-size="34" font-family="Arial, sans-serif">Topic: ${safeTopic}</text>
      <rect x="120" y="424" width="220" height="74" rx="37" fill="rgba(255,255,255,0.92)" />
      <text x="180" y="472" fill="${primary}" font-size="28" font-family="Arial, sans-serif" font-weight="700">Play lesson</text>
      <circle cx="1038" cy="520" r="112" fill="rgba(255,255,255,0.14)" />
      <polygon points="1002,468 1002,572 1094,520" fill="white" />
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const appendVideoMessageToSession = (session, videoJob, packageData) => {
  session.messages = session.messages || [];
  session.messages.push({
    role: "assistant",
    content: packageData.summary,
    mediaType: "video/mp4",
    mediaUrl: videoJob.mediaUrl,
    thumbnailUrl: videoJob.thumbnailUrl,
    topic: packageData.topic,
    caption: packageData.caption,
    fileUrl: "",
    fileName: "",
    createdAt: new Date(),
  });

  if (session.messages.length > CHAT_HISTORY_LIMIT) {
    session.messages = session.messages.slice(-CHAT_HISTORY_LIMIT);
  }

  session.lastMessageAt = new Date();
  if (!session.title || session.title === "New Chat") {
    session.title = buildSessionTitle(packageData.topic);
  }
};

async function generateJobMedia(job, packageData, publicBaseUrl = "") {
  const mediaFilePath = packageData.videoFilePath;
  const thumbnailUrl = buildSvgThumbnail({
    topic: packageData.topic,
    title: packageData.title,
    primary: packageData.thumbnailTheme.primary,
    accent: packageData.thumbnailTheme.accent,
  });

  const baseUrl = String(publicBaseUrl || process.env.PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  const mediaUrl = `${baseUrl}/api/v1/chat/video/media/${job._id}?key=${encodeURIComponent(job.accessKey)}`;

  job.mediaAssetKey = packageData.mediaAssetKey;
  job.mediaUrl = mediaUrl;
  job.thumbnailUrl = thumbnailUrl;
  job.mediaType = "video/mp4";
  job.title = packageData.title;
  job.summary = packageData.summary;
  job.caption = packageData.caption;
  job.progress = 100;
  job.status = "completed";

  return { mediaFilePath, thumbnailUrl, mediaUrl };
}

async function processVideoJob(jobId, publicBaseUrl = "") {
  const job = await VideoGeneration.findById(jobId);
  if (!job || job.status !== "queued") return;

  try {
    job.status = "processing";
    job.progress = 10;
    await job.save();
    await sleep(700);

    const user = await User.findById(job.user);
    if (!user) {
      job.status = "failed";
      job.errorMessage = "User not found";
      await job.save();
      return;
    }

    await ensureChatSessionsInitialized(user);
    const session = await ensureSessionForUser(user, job.sessionId);

    job.progress = 35;
    await job.save();
    await sleep(700);

    const packageData = await buildVideoLecturePackage({
      topic: job.topic,
      firstName: user.firstName || "Student",
    });

    job.normalizedTopic = normalizeTopic(job.topic);
    const mediaDetails = await generateJobMedia(job, packageData, publicBaseUrl);

    job.progress = 70;
    await job.save();
    await sleep(700);

    appendVideoMessageToSession(session, job, packageData);
    user.chatSessions = user.chatSessions || [];
    const index = user.chatSessions.findIndex((item) => item.sessionId === session.sessionId);
    if (index >= 0) {
      user.chatSessions[index] = session;
    }
    await user.save();

    job.status = "completed";
    job.mediaUrl = mediaDetails.mediaUrl;
    job.thumbnailUrl = mediaDetails.thumbnailUrl;
    job.mediaType = "video/mp4";
    job.progress = 100;
    await job.save();
  } catch (error) {
    job.status = "failed";
    job.errorMessage = error?.message || "Video generation failed";
    job.progress = 100;
    await job.save();
  }
}

export const createAiVideoLecture = async (req, res) => {
  try {
    if (!isSchoolUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "AI Video Creator is available only in Kanthast School.",
      });
    }

    const topic = String(req.body?.topic || "").trim();
    if (!topic) {
      return res.status(400).json({ success: false, message: "Topic is required" });
    }

    const user = await User.findById(req.user.id).select("chatSessions chatHistory firstName");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const session = await ensureSessionForUser(user, String(req.body?.sessionId || "").trim());
    const accessKey = crypto.randomUUID().replace(/-/g, "");
    const normalizedTopic = normalizeTopic(topic);

    const job = await VideoGeneration.create({
      user: user._id,
      sessionId: session.sessionId,
      topic,
      normalizedTopic,
      status: "queued",
      progress: 0,
      accessKey,
    });

    const publicBaseUrl = `${req.protocol}://${req.get("host")}`;
    processVideoJob(job._id, publicBaseUrl).catch(() => {});

    return res.status(202).json({
      success: true,
      jobId: job._id,
      sessionId: session.sessionId,
      status: job.status,
      progress: job.progress,
      pollUrl: `/chat/video/status/${job._id}`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAiVideoLectureStatus = async (req, res) => {
  try {
    if (!isSchoolUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "AI Video Creator is available only in Kanthast School.",
      });
    }

    const jobId = String(req.params.jobId || "").trim();
    if (!jobId) {
      return res.status(400).json({ success: false, message: "jobId is required" });
    }

    const job = await VideoGeneration.findOne({ _id: jobId, user: req.user.id });
    if (!job) {
      return res.status(404).json({ success: false, message: "Video generation job not found" });
    }

    return res.status(200).json({
      success: true,
      job: {
        jobId: job._id,
        sessionId: job.sessionId,
        topic: job.topic,
        normalizedTopic: job.normalizedTopic,
        status: job.status,
        progress: job.progress,
        title: job.title,
        summary: job.summary,
        caption: job.caption,
        mediaType: job.mediaType,
        mediaUrl: job.mediaUrl,
        thumbnailUrl: job.thumbnailUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const serveAiVideoLectureMedia = async (req, res) => {
  try {
    const jobId = String(req.params.jobId || "").trim();
    const accessKey = String(req.query.key || "").trim();
    const job = await VideoGeneration.findById(jobId);
    if (!job || !accessKey || job.accessKey !== accessKey) {
      return res.status(404).json({ success: false, message: "Media not found" });
    }

    const filePath = getVideoAssetPathByKey(job.mediaAssetKey || "");
    await fs.access(filePath);
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const serveAiVideoLectureThumbnail = async (req, res) => {
  try {
    const jobId = String(req.params.jobId || "").trim();
    const accessKey = String(req.query.key || "").trim();
    const job = await VideoGeneration.findById(jobId);
    if (!job || !accessKey || job.accessKey !== accessKey) {
      return res.status(404).json({ success: false, message: "Thumbnail not found" });
    }

    const svg = buildSvgThumbnail({
      topic: job.topic,
      title: job.title || job.topic,
      primary: job.mediaAssetKey === "photosynthesis"
        ? "#22c55e"
        : job.mediaAssetKey === "chlorophyll"
        ? "#06b6d4"
        : job.mediaAssetKey === "bacteria"
        ? "#8b5cf6"
        : "#0ea5e9",
      accent: job.mediaAssetKey === "photosynthesis"
        ? "#facc15"
        : job.mediaAssetKey === "chlorophyll"
        ? "#22d3ee"
        : job.mediaAssetKey === "bacteria"
        ? "#60a5fa"
        : "#1d4ed8",
    });

    const raw = decodeURIComponent(svg.replace("data:image/svg+xml;charset=UTF-8,", ""));
    res.setHeader("Content-Type", "image/svg+xml");
    return res.status(200).send(raw);
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};
