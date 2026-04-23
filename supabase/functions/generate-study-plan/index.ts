// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  documentText: string;
  fileName: string;
  language: string;
  focus: string;
  depth: "Shallow" | "Intermediate" | "Deep";
  level: "None" | "Beginner" | "Intermediate" | "Expert";
}

const studyPlanTool = {
  type: "function",
  function: {
    name: "build_study_plan",
    description:
      "Build a personalised study plan with concept explanations, code examples and quizzes.",
    parameters: {
      type: "object",
      properties: {
        projectSummary: {
          type: "string",
          description: "A 2-3 sentence summary of the project the student wants to build.",
        },
        concepts: {
          type: "array",
          description: "Ordered list of key concepts the student must master.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Short concept title." },
              explanation: {
                type: "string",
                description:
                  "Markdown explanation tailored to the student's level and focus. May contain multiple paragraphs and inline `code`.",
              },
              codeExample: {
                type: "string",
                description:
                  "A code snippet in the requested language demonstrating the concept. Use lowerCamelCase for ALL variable and function names. No markdown fences.",
              },
            },
            required: ["name", "explanation", "codeExample"],
            additionalProperties: false,
          },
        },
        quizzes: {
          type: "array",
          description: "Multiple-choice questions covering the concepts.",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                items: { type: "string" },
                description: "Exactly 4 answer options.",
              },
              correctIndex: {
                type: "integer",
                description: "Zero-based index of the correct option.",
              },
              explanation: {
                type: "string",
                description: "Why the correct answer is right.",
              },
            },
            required: ["question", "options", "correctIndex", "explanation"],
            additionalProperties: false,
          },
        },
      },
      required: ["projectSummary", "concepts", "quizzes"],
      additionalProperties: false,
    },
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const { documentText, fileName, language, focus, depth, level } = body;

    if (!documentText || documentText.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Document text is empty or too short to analyse." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Truncate very large documents to keep prompt size sane.
    const trimmed = documentText.slice(0, 60_000);

    const systemPrompt = `You are an expert programming tutor. You design concise, high-signal study plans that prepare a student to complete a specific project.
Always tailor depth, vocabulary and examples to the student's stated starting level and focus areas.
Code style rules (STRICT):
- All variable names and function names in code examples MUST use lowerCamelCase.
- Do NOT wrap code in markdown fences; the codeExample field is raw source.
- Prefer idiomatic, modern style for the requested language.
You must respond by calling the build_study_plan tool exactly once.`;

    const conceptCount = depth === "Shallow" ? "5-7" : depth === "Intermediate" ? "8-10" : "11-14";
    const quizCount = depth === "Shallow" ? "5" : depth === "Intermediate" ? "8" : "12";

    const userPrompt = `Project brief (from file "${fileName}"):
"""
${trimmed}
"""

Student configuration:
- Programming language: ${language}
- Learning focus: ${focus}
- Depth: ${depth}
- Starting level: ${level}

Produce ${conceptCount} concepts and ${quizCount} quiz questions. Order concepts so each one builds on the previous. Calibrate explanations for a "${level}" learner: assume nothing beyond that level.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [studyPlanTool],
        tool_choice: { type: "function", function: { name: "build_study_plan" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const text = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Model did not return a study plan." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let plan: any;
    try {
      plan = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args", e);
      return new Response(JSON.stringify({ error: "Malformed AI response." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-study-plan error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
