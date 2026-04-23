// deno-lint-ignore-file no-explicit-any
import { GoogleGenAI } from "npm:@google/genai@^1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface EvaluateBody {
  kind: "miniTask" | "spotTheBug";
  conceptName: string;
  language: string;
  level: string;
  userAnswer: string;
  // miniTask
  instruction?: string;
  solution?: string;
  // spotTheBug
  buggyCode?: string;
  fixedCode?: string;
  bugExplanation?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return jsonResponse({ error: "GEMINI_API_KEY is not configured" }, 500);

    const body = (await req.json()) as EvaluateBody;
    const { kind, conceptName, language, level, userAnswer } = body;

    if (!kind || !userAnswer?.trim()) {
      return jsonResponse({ error: "Missing fields." }, 400);
    }

    let prompt = "";
    if (kind === "miniTask") {
      prompt = `You are an encouraging ${language} tutor for a "${level}" learner.

Concept: ${conceptName}

Task instruction:
"""
${body.instruction ?? ""}
"""

Reference solution (one valid approach):
"""
${body.solution ?? ""}
"""

The learner submitted this answer:
"""
${userAnswer}
"""

Evaluate CONCEPTUALLY (do not require perfect syntax). Decide one verdict:
- "correct" if the idea works
- "partial" if the approach is on track but missing something important
- "incorrect" if the approach won't work or misses the concept

Return STRICT JSON only, no markdown, with this shape:
{"verdict":"correct|partial|incorrect","feedback":"1-3 short sentences with concrete guidance, friendly tone"}`;
    } else {
      prompt = `You are an encouraging ${language} tutor for a "${level}" learner.

Concept: ${conceptName}

Buggy code:
"""
${body.buggyCode ?? ""}
"""

The actual bug: ${body.bugExplanation ?? ""}
Fixed version:
"""
${body.fixedCode ?? ""}
"""

The learner submitted this (could be a fix or an explanation):
"""
${userAnswer}
"""

Evaluate CONCEPTUALLY (don't require perfect syntax). Decide one verdict:
- "correct" if they identified or fixed the real bug
- "partial" if they noticed something related but missed the core issue
- "incorrect" if they missed the bug

Return STRICT JSON only, no markdown, with this shape:
{"verdict":"correct|partial|incorrect","feedback":"1-3 short sentences with concrete guidance, friendly tone"}`;
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = result.text?.trim() ?? "";
    // Strip code fences if any
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    let parsed: { verdict?: string; feedback?: string } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: best-effort
      parsed = { verdict: "partial", feedback: text || "Couldn't parse a verdict — keep iterating!" };
    }

    const verdict = parsed.verdict === "correct" || parsed.verdict === "partial" || parsed.verdict === "incorrect"
      ? parsed.verdict
      : "partial";
    const feedback = parsed.feedback?.trim() || "Keep going!";

    return jsonResponse({ verdict, feedback });
  } catch (e) {
    console.error("evaluateAnswer error", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
