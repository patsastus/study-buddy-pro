// deno-lint-ignore-file no-explicit-any
import { AdapterError, generateText } from "../_shared/llm.ts";

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

interface ReExplainBody {
  conceptName: string;
  originalExplanation: string;
  language: string;
  level: string;
  style: "simpler" | "analogy" | "deeper";
}

const styleInstruction: Record<ReExplainBody["style"], string> = {
  simpler:
    "Re-explain the concept in the simplest possible terms, as if to a complete beginner. Avoid jargon. 2-4 short sentences.",
  analogy:
    "Re-explain the concept using a vivid real-world analogy that makes it instantly intuitive. 2-4 sentences.",
  deeper:
    "Re-explain the concept with deeper technical detail: edge cases, performance characteristics, common pitfalls. 3-5 sentences.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json()) as ReExplainBody;
    const { conceptName, originalExplanation, language, level, style } = body;

    if (!conceptName || !style || !styleInstruction[style]) {
      return jsonResponse({ error: "Missing or invalid fields." }, 400);
    }

    const prompt = `You are an expert ${language} tutor helping a "${level}" level learner.

Concept: ${conceptName}

Original explanation:
"""
${originalExplanation}
"""

${styleInstruction[style]}

Return only the new explanation as plain text. No markdown headings, no preface.`;

    const explanation = await generateText({
      provider: "gemini",
      model: "gemini-2.5-flash",
      prompt,
    });

    return jsonResponse({ explanation });
  } catch (e) {
    if (e instanceof AdapterError) {
      return jsonResponse({ error: e.message, ...(e.detail ? { detail: e.detail } : {}) }, e.status);
    }
    console.error("reExplainConcept error", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
