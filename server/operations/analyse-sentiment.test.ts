import { expect } from "jsr:@std/expect";
import { afterAll, beforeAll, beforeEach, describe, it } from "jsr:@std/testing/bdd";
import analyzeSentiment from "./analyze-sentiment.ts";

// Utility to stub/restore global fetch
const originalFetch = globalThis.fetch;

describe("analyze-sentiment (Gemini, 3-class)", () => {
  let prevGeminiKey: string | undefined;

  beforeAll(() => {
    // Preserve existing env, set a dummy key so function takes the Gemini path
    prevGeminiKey = Deno.env.get("GEMINI_API_KEY") ?? undefined;
    Deno.env.set("GEMINI_API_KEY", "test-key");
  });

  afterAll(() => {
    // Restore env and fetch
    if (prevGeminiKey) {
      Deno.env.set("GEMINI_API_KEY", prevGeminiKey);
    } else {
      try { Deno.env.delete("GEMINI_API_KEY"); } catch {}
    }
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    // reset fetch before each test
    globalThis.fetch = originalFetch;
  });

  it("returns neutral for empty/whitespace without calling the network", async () => {
    let called = 0;
    globalThis.fetch = async () => {
      called++;
      return new Response("should-not-be-called", { status: 500 });
    };

    const r1 = await analyzeSentiment("");
    const r2 = await analyzeSentiment("   ");

    expect(r1.label).toBe("neutral");
    expect(r2.label).toBe("neutral");
    expect(called).toBe(0);
  });

  it("parses fenced JSON from Gemini and normalizes label", async () => {
    globalThis.fetch = async () => {
      // Simulate Gemini response with ```json code fences
      const body = {
        candidates: [
          { content: { parts: [{ text: "```json\n{\"label\":\"NEUTRAL\",\"score\":0.62}\n```" }] } },
        ],
      };
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const out = await analyzeSentiment("dssasadsadassds");
    expect(out.label).toBe("neutral");
    expect(out.score).toBeGreaterThan(0);
    expect(out.score).toBeLessThanOrEqual(1);
  });

  it("caches results for identical text (second call does not re-fetch)", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      const body = {
        candidates: [
          { content: { parts: [{ text: "{\"label\":\"POSITIVE\",\"score\":0.91}" }] } },
        ],
      };
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const text = "This brand is amazing!";
    const a = await analyzeSentiment(text);
    const b = await analyzeSentiment(text);

    expect(a.label).toBe("positive");
    expect(b.label).toBe("positive");
    expect(calls).toBe(1); // cached on second call
  });

  it("throws when the API returns a non-200", async () => {
    globalThis.fetch = async () =>
      new Response("server broke", { status: 500 });

    await expect(analyzeSentiment("oops")).rejects.toThrow();
  });
});

describe("analyze-sentiment (no API key)", () => {
  let savedKey: string | undefined;

  beforeAll(() => {
    savedKey = Deno.env.get("GEMINI_API_KEY") ?? undefined;
    try { Deno.env.delete("GEMINI_API_KEY"); } catch {}
  });

  afterAll(() => {
    if (savedKey) Deno.env.set("GEMINI_API_KEY", savedKey);
  });

  it("throws a clear error if no key is configured", async () => {
    await expect(analyzeSentiment("hello")).rejects.toThrow();
  });
});
