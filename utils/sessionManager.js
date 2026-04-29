import { randomUUID } from "crypto";
import UserSession from "../models/UserSession.js";

export function getRequestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "";
}

export function normalizeSessionInput(session = {}) {
  const geo = session.geo || {};
  const latitude = Number.isFinite(Number(geo.latitude)) ? Number(geo.latitude) : null;
  const longitude = Number.isFinite(Number(geo.longitude)) ? Number(geo.longitude) : null;
  const accuracy = Number.isFinite(Number(geo.accuracy)) ? Number(geo.accuracy) : null;

  return {
    deviceName: String(session.deviceName || "Unknown device").trim() || "Unknown device",
    browserName: String(session.browserName || "Unknown browser").trim() || "Unknown browser",
    browserVersion: String(session.browserVersion || "").trim(),
    osName: String(session.osName || "Unknown OS").trim() || "Unknown OS",
    platform: String(session.platform || "").trim(),
    userAgent: String(session.userAgent || "").trim(),
    locationSource: ["gps", "ip", "unknown"].includes(session.locationSource)
      ? session.locationSource
      : "unknown",
    locationLabel: String(session.locationLabel || "Unknown").trim() || "Unknown",
    geo: {
      latitude,
      longitude,
      accuracy,
    },
  };
}

export async function revokeAllActiveSessions(userId, reason = "new_login") {
  await UserSession.updateMany(
    { user: userId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    }
  );
}

export async function createSession({ userId, tokenId, request, session = {} }) {
  const normalized = normalizeSessionInput(session);
  const ipAddress = String(session.ipAddress || getRequestIp(request) || "").trim();

  return UserSession.create({
    user: userId,
    sessionId: tokenId,
    tokenId,
    deviceName: normalized.deviceName,
    browserName: normalized.browserName,
    browserVersion: normalized.browserVersion,
    osName: normalized.osName,
    platform: normalized.platform,
    userAgent: normalized.userAgent,
    ipAddress,
    locationSource: normalized.locationSource,
    locationLabel: normalized.locationLabel,
    geo: normalized.geo,
    startedAt: new Date(),
    lastSeenAt: new Date(),
  });
}

export async function getActiveSessionByToken(tokenId) {
  if (!tokenId) return null;
  return UserSession.findOne({ tokenId, revokedAt: null });
}

export async function markSessionSeen(tokenId) {
  if (!tokenId) return null;
  return UserSession.findOneAndUpdate(
    { tokenId, revokedAt: null },
    { $set: { lastSeenAt: new Date() } },
    { new: true }
  );
}

export async function revokeSessionById(userId, sessionId, reason = "manual_logout") {
  return UserSession.findOneAndUpdate(
    { user: userId, sessionId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    },
    { new: true }
  );
}

export async function revokeOtherSessions(userId, currentSessionId) {
  return UserSession.updateMany(
    {
      user: userId,
      revokedAt: null,
      sessionId: { $ne: currentSessionId },
    },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: "logout_other_sessions",
        revokedBySessionId: currentSessionId,
      },
    }
  );
}

export function buildSessionPayload(session, currentSessionId = "") {
  if (!session) return null;
  return {
    sessionId: session.sessionId,
    tokenId: session.tokenId,
    deviceName: session.deviceName,
    browserName: session.browserName,
    browserVersion: session.browserVersion,
    osName: session.osName,
    platform: session.platform,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    locationSource: session.locationSource,
    locationLabel: session.locationLabel,
    geo: session.geo || null,
    startedAt: session.startedAt,
    lastSeenAt: session.lastSeenAt,
    revokedAt: session.revokedAt,
    revokedReason: session.revokedReason,
    revokedBySessionId: session.revokedBySessionId,
    isCurrent: currentSessionId ? String(session.sessionId) === String(currentSessionId) : false,
    isActive: !session.revokedAt,
  };
}

export function newSessionId() {
  return randomUUID();
}
