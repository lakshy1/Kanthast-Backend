import mongoose from "mongoose";
import User from "../models/User.js";
import SupportQuery from "../models/SupportQuery.js";
import { uploadImageToCloudinary } from "../utils/imageUploader.js";

const CHAT_HISTORY_LIMIT = 300;
const SUPPORT_SNAPSHOT_LIMIT = 20;
const interfaceIssuePattern =
  /(interface|video|layout|not\s*working|broken|error|bug|can't)/i;
const subscriptionQueryPattern =
  /(subscription|pricing|price|plan|plans|cost|fees?|upgrade|premium|basic\s+plan)/i;
const lockedVideoPattern =
  /(videos?\s+(are|is)\s+locked|all\s+videos?\s+(are|is)\s+not\s+unlocked|video\s+locked|content\s+locked)/i;
const supportAcknowledgement =
  "I will notify the support team to resolve your issue within 24-48 hours. Thank you for for reporting this.";
const subscriptionPagePath = "/subscription";
const subscriptionReply =
  "Kanthast subscription details:\n- Basic plan: 110 USD for 1 year.\n- Basic plan: 200 USD for 2 year plan.\n\nAn active subscription unlocks all platform content.";
const lockedVideoReply =
  "It looks like your videos are locked. Please purchase a subscription to unlock all content.\n\nSubscription cost:\n- 110 USD for 1 year\n- 200 USD for 2 year plan\n\nOnly 2 videos are available for free.";
const subscriptionReplyWithLink = `${subscriptionReply}\n\nPurchase page: ${subscriptionPagePath}`;
const lockedVideoReplyWithLink = `${lockedVideoReply}\nPurchase page: ${subscriptionPagePath}`;

const supportSystemPrompt = `You are Kanthast Support Assistant.
Primary goal: help users resolve platform issues quickly and clearly.
Secondary goal: answer learning-related questions in concise, practical terms.
Communication style: professional, polite, concise, and accurate.

Rules:
1) If user reports a platform issue (login, OTP, payments, lists, videos, profile, upload, performance), ask clarifying details and provide step-by-step troubleshooting.
2) If issue can be escalated, recommend user to share reproducible steps and screenshot.
3) Keep answers direct and easy to follow.
4) Never claim actions you did not perform.
5) If unsure, state uncertainty and suggest the safest next step.
6) If user asks about subscription, pricing, plans, or cost, always use this exact policy:
   - Basic subscription is 110 USD for 1 year.
   - Basic subscription is 200 USD for 2 year plan.
   - Taking a subscription unlocks all content on the platform.
   - Also share this purchase link: /subscription
7) If user says videos are locked or not unlocked, tell them subscription is required and mention only 2 videos are free.
   - Also share this purchase link: /subscription
8) Return plain text only. Keep bullet readability by using "-" for list items. Do not use markdown emphasis symbols like * or **.
`;

const stripMarkdownFormatting = (text = "") =>
  text
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/`/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^(\s*)[*]\s+/gm, "$1- ")
    .replace(/^(\s*)\d+\.\s+/gm, "$1- ")
    .replace(/^(\s*)#+\s+/gm, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeChatText = (text = "") =>
  String(text).toLowerCase().replace(/[^a-z0-9]/g, "");

const getRecentContext = (history = [], count = 12) =>
  history.slice(-count).map((item) => ({
    role: item.role,
    content: item.fileUrl
      ? `${item.content}\n[Attached file: ${item.fileName || "file"} - ${item.fileUrl}]`
      : item.content,
  }));

const isInterfaceIssueMessage = (text = "") => interfaceIssuePattern.test(text);

const subscriptionKeywordTokens = [
  "subscription",
  "subscriptionprice",
  "pricing",
  "price",
  "plans",
  "plan",
  "cost",
  "fees",
  "premium",
  "upgrade",
];

const lockedVideoKeywordTokens = [
  "videolocked",
  "videoslocked",
  "allvideosnotunlocked",
  "videosnotunlocked",
  "contentlocked",
  "unlockvideos",
  "lockedvideos",
];

const includesAnyToken = (normalizedText = "", tokens = []) =>
  tokens.some((token) => normalizedText.includes(token));

const isSubscriptionQuestion = (text = "") => {
  const normalizedText = normalizeChatText(text);
  return (
    subscriptionQueryPattern.test(text) ||
    includesAnyToken(normalizedText, subscriptionKeywordTokens)
  );
};

const isLockedVideoQuestion = (text = "") => {
  const normalizedText = normalizeChatText(text);
  return (
    lockedVideoPattern.test(text) ||
    includesAnyToken(normalizedText, lockedVideoKeywordTokens)
  );
};

const logProviderFailure = (provider, error, meta = {}) => {
  console.error(`[chatbot:${provider}]`, {
    message: error?.message || "Unknown provider error",
    ...meta,
  });
};

const buildSupportSnapshot = (messages = []) =>
  messages.slice(-SUPPORT_SNAPSHOT_LIMIT).map((item) => ({
    role: item.role,
    content: item.content,
    fileUrl: item.fileUrl || "",
    fileName: item.fileName || "",
    createdAt: item.createdAt || new Date(),
  }));

const GEMINI_API_VERSIONS = ["v1", "v1beta"];

const normalizeModelName = (modelName = "") => modelName.replace(/^models\//, "").trim();

const staticGeminiCandidateModels = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]
  .filter(Boolean)
  .map(normalizeModelName);

const listGeminiModels = async ({ apiKey, apiVersion }) => {
  const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${apiKey}`;
  const response = await fetch(endpoint);
  if (!response.ok) return [];

  const data = await response.json();
  const models = data?.models || [];

  return models
    .filter((model) => model?.supportedGenerationMethods?.includes("generateContent"))
    .map((model) => normalizeModelName(model?.name))
    .filter(Boolean);
};

const getDynamicGeminiCandidates = async (apiKey) => {
  const candidates = [];

  for (const apiVersion of GEMINI_API_VERSIONS) {
    const models = await listGeminiModels({ apiKey, apiVersion });
    for (const model of models) {
      candidates.push({ model, apiVersion });
    }
  }

  return candidates;
};

const getStaticGeminiCandidates = () => {
  const candidates = [];

  for (const apiVersion of GEMINI_API_VERSIONS) {
    for (const model of staticGeminiCandidateModels) {
      candidates.push({ model, apiVersion });
    }
  }

  return candidates;
};

const callGeminiModel = async ({ apiKey, model, prompt, context, apiVersion }) => {
  const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `System instructions:\n${supportSystemPrompt}` }],
        },
        ...context.map((item) => ({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: item.content }],
        })),
        { role: "user", parts: [{ text: prompt }] },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 700,
      },
    }),
  });

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!response.ok || !text) {
    throw new Error(data?.error?.message || `Gemini request failed for model ${model}`);
  }

  return stripMarkdownFormatting(text);
};

const generateWithGemini = async ({ apiKey, prompt, context }) => {
  const cleanApiKey = (apiKey || "").trim();
  if (!cleanApiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  let lastError = null;
  const triedCombos = new Set();

  const dynamicCandidates = await getDynamicGeminiCandidates(cleanApiKey);
  const candidates = [...dynamicCandidates, ...getStaticGeminiCandidates()];

  for (const { model, apiVersion } of candidates) {
    const combo = `${apiVersion}:${model}`;
    if (!model || triedCombos.has(combo)) continue;
    triedCombos.add(combo);

    try {
      return await callGeminiModel({
        apiKey: cleanApiKey,
        model,
        prompt,
        context,
        apiVersion,
      });
    } catch (error) {
      logProviderFailure("gemini-attempt", error, { model, apiVersion });
      lastError = error;
    }
  }

  if (lastError) {
    logProviderFailure("gemini-final", lastError, { attempts: triedCombos.size });
  }
  throw lastError || new Error("Gemini API request failed");
};

const generateWithOpenAI = async ({ apiKey, prompt, context }) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: supportSystemPrompt },
        ...context.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!response.ok || !text) {
    const error = new Error(data?.error?.message || "OpenAI API request failed");
    logProviderFailure("openai", error, { status: response.status });
    throw error;
  }
  return stripMarkdownFormatting(text);
};

const generateAssistantReply = async ({ prompt, context }) => {
  if ((process.env.GEMINI_API_KEY || "").trim()) {
    return generateWithGemini({
      apiKey: process.env.GEMINI_API_KEY,
      prompt,
      context,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      prompt,
      context,
    });
  }

  return "AI provider key missing. Add GEMINI_API_KEY or OPENAI_API_KEY in backend .env to enable live assistant responses.";
};

const buildSessionTitle = (text = "") => {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "New Chat";
  return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean;
};

const toSessionSummary = (session) => {
  const messages = session.messages || [];
  const firstUserMessage = messages.find((item) => item.role === "user")?.content || "";
  const latestMessage = messages[messages.length - 1]?.content || "";

  return {
    sessionId: session.sessionId,
    title: session.title || buildSessionTitle(firstUserMessage),
    preview: latestMessage.slice(0, 80),
    messageCount: messages.length,
    lastMessageAt: session.lastMessageAt || session.updatedAt || session.createdAt,
    createdAt: session.createdAt,
  };
};

const sortSessionsByRecent = (sessions = []) =>
  [...sessions].sort((a, b) => {
    const aTime = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });

const createEmptySession = () => {
  const now = new Date();
  return {
    sessionId: new mongoose.Types.ObjectId().toString(),
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
        fileUrl: item.fileUrl || "",
        fileName: item.fileName || "",
        createdAt: item.createdAt || new Date(),
      }));

    const firstUserMessage = migratedMessages.find((item) => item.role === "user")?.content || "";

    user.chatSessions.push({
      sessionId: new mongoose.Types.ObjectId().toString(),
      title: buildSessionTitle(firstUserMessage),
      messages: migratedMessages,
      lastMessageAt:
        migratedMessages[migratedMessages.length - 1]?.createdAt || new Date(),
    });
  } else {
    user.chatSessions.push(createEmptySession());
  }

  await user.save();
  return true;
};

const getSessionFromUser = (user, sessionId = "") => {
  if (!sessionId) return null;
  return (user.chatSessions || []).find((session) => session.sessionId === sessionId) || null;
};

const getLatestSession = (user) => {
  const sorted = sortSessionsByRecent(user.chatSessions || []);
  return sorted[0] || null;
};

export const createChatSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("chatSessions chatHistory");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await ensureChatSessionsInitialized(user);

    const session = createEmptySession();
    user.chatSessions.push(session);
    await user.save();

    const sessions = sortSessionsByRecent(user.chatSessions).map(toSessionSummary);

    return res.status(200).json({
      success: true,
      session: toSessionSummary(session),
      sessions,
      currentSessionId: session.sessionId,
      messages: [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteChatSession = async (req, res) => {
  try {
    const targetSessionId = (req.params.sessionId || "").trim();
    if (!targetSessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const requestedActiveSessionId = (req.query.activeSessionId || "").trim();
    const user = await User.findById(req.user.id).select("chatHistory chatSessions");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await ensureChatSessionsInitialized(user);

    const exists = (user.chatSessions || []).some(
      (session) => session.sessionId === targetSessionId
    );
    if (!exists) {
      return res.status(404).json({ success: false, message: "Chat session not found" });
    }

    user.chatSessions = (user.chatSessions || []).filter(
      (session) => session.sessionId !== targetSessionId
    );

    if (user.chatSessions.length === 0) {
      user.chatSessions.push(createEmptySession());
    }

    const sessions = sortSessionsByRecent(user.chatSessions);
    let activeSession =
      getSessionFromUser(user, requestedActiveSessionId) ||
      getSessionFromUser(user, targetSessionId) ||
      sessions[0];

    // If deleted session was active, fallback to most recent remaining session
    if (activeSession?.sessionId === targetSessionId) {
      activeSession = sessions[0];
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Chat session deleted",
      sessions: sortSessionsByRecent(user.chatSessions).map(toSessionSummary),
      currentSessionId: activeSession?.sessionId || "",
      messages: activeSession?.messages || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const requestedSessionId = (req.query.sessionId || "").trim();
    const user = await User.findById(req.user.id).select("chatHistory chatSessions");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await ensureChatSessionsInitialized(user);

    let activeSession = getSessionFromUser(user, requestedSessionId);
    if (!activeSession) {
      activeSession = getLatestSession(user);
    }

    const sessions = sortSessionsByRecent(user.chatSessions).map(toSessionSummary);

    return res.status(200).json({
      success: true,
      sessions,
      currentSessionId: activeSession?.sessionId || "",
      messages: activeSession?.messages || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const { message, fileUrl = "", fileName = "", sessionId = "" } = req.body;
    const cleanMessage = (message || "").trim();
    const cleanSessionId = (sessionId || "").trim();

    if (!cleanMessage) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await ensureChatSessionsInitialized(user);

    let activeSession = getSessionFromUser(user, cleanSessionId);
    if (!activeSession) {
      const newSession = createEmptySession();
      user.chatSessions.push(newSession);
      activeSession = getSessionFromUser(user, newSession.sessionId);
    }

    const now = new Date();

    activeSession.messages = activeSession.messages || [];
    activeSession.messages.push({
      role: "user",
      content: cleanMessage,
      fileUrl,
      fileName,
      createdAt: now,
    });

    if (!activeSession.title || activeSession.title === "New Chat") {
      activeSession.title = buildSessionTitle(cleanMessage);
    }

    const interfaceIssueReported = isInterfaceIssueMessage(cleanMessage);
    const subscriptionQuestion = isSubscriptionQuestion(cleanMessage);
    const lockedVideoQuestion = isLockedVideoQuestion(cleanMessage);
    let assistantReply = supportAcknowledgement;

    if (lockedVideoQuestion) {
      assistantReply = lockedVideoReplyWithLink;
    } else if (subscriptionQuestion) {
      assistantReply = subscriptionReplyWithLink;
    } else if (!interfaceIssueReported) {
      const context = getRecentContext(activeSession.messages, 12);
      assistantReply = await generateAssistantReply({
        prompt: cleanMessage,
        context,
      });
    }

    activeSession.messages.push({
      role: "assistant",
      content: assistantReply,
      fileUrl: "",
      fileName: "",
      createdAt: new Date(),
    });

    if (activeSession.messages.length > CHAT_HISTORY_LIMIT) {
      activeSession.messages = activeSession.messages.slice(-CHAT_HISTORY_LIMIT);
    }

    activeSession.lastMessageAt = new Date();

    if (fileUrl || interfaceIssueReported) {
      await SupportQuery.create({
        user: user._id,
        sessionId: activeSession.sessionId,
        sessionTitle: activeSession.title || "New Chat",
        message: cleanMessage,
        fileUrl,
        fileName,
        issueType: interfaceIssueReported
          ? "interface_issue"
          : fileUrl
          ? "attachment_only"
          : "general",
        source: "chatbot",
        conversationSnapshot: buildSupportSnapshot(activeSession.messages),
      });
    }

    await user.save();

    const sessions = sortSessionsByRecent(user.chatSessions).map(toSessionSummary);

    return res.status(200).json({
      success: true,
      reply: assistantReply,
      sessionId: activeSession.sessionId,
      sessions,
      currentSessionId: activeSession.sessionId,
      messages: activeSession.messages,
    });
  } catch (error) {
    console.error("[chatbot:sendChatMessage]", {
      message: error?.message || "Unknown error",
      userId: req?.user?.id || "",
    });
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadChatFile = async (req, res) => {
  try {
    const file = req.files?.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const uploaded = await uploadImageToCloudinary(
      file,
      process.env.CHATBOT_FOLDER || "kanthast-chat"
    );

    return res.status(200).json({
      success: true,
      fileUrl: uploaded.secure_url,
      fileName: file.name,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
