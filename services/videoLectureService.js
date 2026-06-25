import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIDEO_ASSET_DIR = path.resolve(__dirname, "../../Frontend/src/assets/videos");

const assetLibrary = [
  {
    key: "photosynthesis",
    fileName: "Video-1.mp4",
    thumbnailHue: "#22c55e",
    accentHue: "#facc15",
    keywords: ["photosynthesis", "chlorophyll", "plant", "leaf", "sunlight"],
  },
  {
    key: "chlorophyll",
    fileName: "Video-2.mp4",
    thumbnailHue: "#06b6d4",
    accentHue: "#22d3ee",
    keywords: ["chlorophyll", "chloroplast", "pigment", "green"],
  },
  {
    key: "bacteria",
    fileName: "compressed_Video-2.mp4",
    thumbnailHue: "#8b5cf6",
    accentHue: "#60a5fa",
    keywords: ["bacteria", "microbe", "microbiology", "cell", "germs"],
  },
  {
    key: "default",
    fileName: "Kanthast.mp4",
    thumbnailHue: "#0ea5e9",
    accentHue: "#1d4ed8",
    keywords: [],
  },
];

export function getVideoAssetByKey(key = "") {
  return assetLibrary.find((asset) => asset.key === key) || assetLibrary[assetLibrary.length - 1];
}

export function getVideoAssetPathByKey(key = "") {
  const asset = getVideoAssetByKey(key);
  return path.join(VIDEO_ASSET_DIR, asset.fileName);
}

function normalizeText(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value = "") {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function pickAsset(topic = "") {
  const normalized = normalizeText(topic);
  return (
    assetLibrary.find((asset) => asset.key !== "default" && asset.key === normalized) ||
    assetLibrary.find((asset) => asset.key !== "default" && asset.keywords.some((keyword) => normalized.includes(keyword))) ||
    assetLibrary[assetLibrary.length - 1]
  );
}

function fallbackScript(topic = "", firstName = "") {
  const cleanTopic = titleCase(topic || "this topic");
  const learner = firstName ? `${firstName}, ` : "";
  return {
    title: `${cleanTopic} Explained`,
    summary: `${learner}here is a short, bright lesson on ${cleanTopic.toLowerCase()} made for easy understanding.`,
    caption: `A kid-friendly AI lecture about ${cleanTopic}.`,
    bullets: [
      `What ${cleanTopic} is`,
      `Why it matters`,
      `A simple memory trick`,
    ],
  };
}

async function generateWithGemini(prompt) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;

  const model = (process.env.GEMINI_MODEL || "gemini-1.5-flash").replace(/^models\//, "");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "Create a short, child-friendly lecture outline in JSON.",
                "Return only valid JSON with title, summary, caption, and bullets (array of 3 short items).",
                prompt,
              ].join("\n"),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 300,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!response.ok || !text) return null;

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    return {
      title: String(parsed.title || "").trim(),
      summary: String(parsed.summary || "").trim(),
      caption: String(parsed.caption || "").trim(),
      bullets: Array.isArray(parsed.bullets)
        ? parsed.bullets.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
        : [],
    };
  } catch {
    return null;
  }
}

async function generateWithOpenAI(prompt) {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "Create a short, child-friendly lecture outline. Return only JSON with title, summary, caption, and bullets array of 3 short items.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  const text = data?.choices?.[0]?.message?.content || "";
  if (!response.ok || !text) return null;

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    return {
      title: String(parsed.title || "").trim(),
      summary: String(parsed.summary || "").trim(),
      caption: String(parsed.caption || "").trim(),
      bullets: Array.isArray(parsed.bullets)
        ? parsed.bullets.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
        : [],
    };
  } catch {
    return null;
  }
}

export async function buildVideoLecturePackage({ topic = "", firstName = "" }) {
  const asset = pickAsset(topic);
  const prompt = [
    `Topic: ${topic}`,
    `Student name: ${firstName || "Student"}`,
    "Audience: school-age children.",
    "Tone: warm, visual, simple, encouraging.",
    "Length: one short animated lesson.",
  ].join("\n");

  const aiScript = (await generateWithGemini(prompt)) || (await generateWithOpenAI(prompt)) || fallbackScript(topic, firstName);
  const cleanTitle = aiScript.title || `${titleCase(topic || "Topic")} Explained`;
  const cleanSummary = aiScript.summary || fallbackScript(topic, firstName).summary;
  const bullets = aiScript.bullets?.length ? aiScript.bullets : fallbackScript(topic, firstName).bullets;

  return {
    topic: String(topic || "").trim(),
    normalizedTopic: normalizeText(topic),
    title: cleanTitle,
    summary: cleanSummary,
    caption: aiScript.caption || `A kid-friendly AI lecture about ${titleCase(topic || "this topic")}.`,
    bullets,
    mediaAssetKey: asset.key,
    mediaFileName: asset.fileName,
    videoFilePath: path.join(VIDEO_ASSET_DIR, asset.fileName),
    thumbnailTheme: {
      primary: asset.thumbnailHue,
      accent: asset.accentHue,
    },
  };
}
