// deno-lint-ignore-file no-explicit-any

/** Allowed sentiment labels returned by the classifier. */
export type SentimentLabel = "positive" | "neutral" | "negative";

export type Sentiment = { label: SentimentLabel; score: number };

/** Simple in-memory cache keyed by the exact input text. */
const CACHE = new Map<string, Sentiment>();

/** Constants for the Gemini call. */
// env this model as it may change in future, no redeployment needed
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

/** Clamp a number to [0, 1]. */
const clamp = (n: number) => Math.max(0, Math.min(1, Number(n)));

/** Convert a raw model label to our SentimentLabel. Defaults to "neutral". */
function normalizeLabel(raw: unknown): SentimentLabel {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("pos")) return "positive";
  if (s.includes("neu")) return "neutral";
  if (s.includes("neg")) return "negative";
  if (s === "positive" || s === "neutral" || s === "negative") return s;
  return "neutral";
}

/**
 * Parse text that should contain JSON, tolerating ```json fences.
 * Returns the parsed value (or throws if nothing JSON-like is found).
 */
function parseJsonish(text: string): unknown {
  const trimmed = (text ?? "").trim();
  // 1) direct
  try { return JSON.parse(trimmed); } catch {}
  // 2) fenced ```json ... ```
  const unfenced = trimmed
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "");
  try { return JSON.parse(unfenced); } catch {}
  // 3) first {...} block
  const match = trimmed.match(/{[\s\S]*}/);
  if (match) return JSON.parse(match[0]);
  throw new Error(`Model did not return valid JSON: ${trimmed.slice(0, 120)}…`);
}

/**
 * Classify sentiment (positive/neutral/negative) using Gemini.
 * - Uses a tiny in-memory cache by text.
 * - Requires GEMINI_API_KEY in the environment.
 *
 * @param text Freeform input to classify.
 * @returns Normalized { label, score } where score ∈ [0,1]
 */
export default async function analyzeSentiment(text: string): Promise<Sentiment> {
  const input = (text ?? "").trim();
  if (!input) return { label: "neutral", score: 0.5 };

  // Cache hit
  const cached = CACHE.get(input);
  if (cached) return cached;

  // API key
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("No LLM available: set GEMINI_API_KEY in the env");
  }

  // Request body
  const body = {
    systemInstruction: {
      role: "system",
      parts: [{
        text: [
          "You are a strict sentiment classifier.",
          "Classify the text as exactly one of: POSITIVE, NEUTRAL, NEGATIVE.",
          "Respond ONLY with JSON: {\"label\":\"positive|neutral|negative\",\"score\":0..1}.",
          "The \"score\" is your confidence for the chosen label.",
        ].join(" "),
      }],
    },
    contents: [{ role: "user", parts: [{ text: input }] }],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0,
      topP: 0,
    },
  };

  // Call Gemini
  const response = await fetch(GEMINI_URL(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.warn("Gemini error:", response.status, errText);
    throw new Error(`Gemini error ${response.status}`);
  }

  const json = await response.json();
  const modelText: string =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  const parsed = parseJsonish(modelText) as any;

  const result: Sentiment = {
    label: normalizeLabel(parsed?.label),
    score: clamp(parsed?.score ?? 0.5),
  };

  CACHE.set(input, result);
  return result;
}
