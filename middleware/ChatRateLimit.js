const CHAT_RATE_LIMIT_WINDOW_MS = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || 60_000);
const CHAT_RATE_LIMIT_MAX = Number(process.env.CHAT_RATE_LIMIT_MAX || 20);

const requestBuckets = new Map();

const getClientKey = (req) => req?.user?.id || req.ip || "unknown-client";

export const chatRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = getClientKey(req);
  const bucket = requestBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    requestBuckets.set(key, {
      count: 1,
      resetAt: now + CHAT_RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (bucket.count >= CHAT_RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: `Too many chat requests. Try again in ${retryAfterSeconds} seconds.`,
    });
  }

  bucket.count += 1;
  requestBuckets.set(key, bucket);
  return next();
};
