// deno-lint-ignore-file no-explicit-any
export type SentimentLabel = "positive" | "neutral" | "negative";
export type Sentiment = { label: SentimentLabel; score: number };

const cache = new Map<string, Sentiment>();

const normalize = (raw: string): SentimentLabel => {
  const l = String(raw || "").toLowerCase();
  if (l.includes("pos")) return "positive";
  if (l.includes("neu")) return "neutral";
  if (l.includes("neg")) return "negative";
  return (["positive", "neutral", "negative"] as const).includes(l as any)
    ? (l as SentimentLabel)
    : "neutral";
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number(n)));

function parseJsonish(raw: string): any {
  const s = (raw ?? "").trim();
  try { return JSON.parse(s); } catch {}
  const unfenced = s.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  try { return JSON.parse(unfenced); } catch {}
  const m = s.match(/{[\s\S]*}/);
  if (m) return JSON.parse(m[0]);
  throw new Error(`Model did not return valid JSON: ${s.slice(0, 120)}…`);
}

export default async function analyzeSentiment(text: string): Promise<Sentiment> {
  const t = (text ?? "").trim();
  if (!t) return { label: "neutral", score: 0.5 };

  const hit = cache.get(t);
  if (hit) return hit;

  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) throw new Error("No LLM available: set GEMINI_API_KEY or GOOGLE_API_KEY");

  const body = {
    systemInstruction: {
      role: "system",
      parts: [
        {
          text:
            `You are a strict sentiment classifier. ` +
            `Classify the sentiment as exactly one of: POSITIVE, NEUTRAL, NEGATIVE. ` +
            `Respond ONLY with JSON like: {"label":"positive|neutral|negative","score":0..1} (no extra text). ` +
            `The "score" is your confidence for the chosen label.`,
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: t }],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0,
      topP: 0,
    },
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) {
    const txt = await resp.text();
    console.warn("Gemini error:", resp.status, txt);
    throw new Error(`Gemini error ${resp.status}`);
  }

  const data = await resp.json();
  const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = parseJsonish(textOut);

  const result: Sentiment = {
    label: normalize(parsed?.label),
    score: clamp01(parsed?.score ?? 0.5),
  };

  cache.set(t, result);
  return result;
}
