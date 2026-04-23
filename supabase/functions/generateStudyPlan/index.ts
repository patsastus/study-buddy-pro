// deno-lint-ignore-file no-explicit-any
import { GoogleGenAI, Type, createUserContent, createPartFromUri } from "npm:@google/genai@^1.0.0";

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

const studyPlanSchema = {
  type: Type.OBJECT,
  properties: {
    projectSummary: { type: Type.STRING },
    concepts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          explanation: { type: Type.STRING },
          codeExample: { type: Type.STRING },
        },
        required: ["name", "explanation", "codeExample"],
      },
    },
    quizzes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
        required: ["question", "options", "correctIndex", "explanation"],
      },
    },
  },
  required: ["projectSummary", "concepts", "quizzes"],
};

const buildPrompt = (
  language: string,
  focus: string,
  depth: string,
  level: string,
) => {
  const conceptCount =
    depth === "Shallow" ? "5-7" : depth === "Intermediate" ? "8-10" : "11-14";
  const quizCount = depth === "Shallow" ? "5" : depth === "Intermediate" ? "8" : "12";

  return `You are an expert programming tutor. Read the attached project brief and design a personalised study plan.

Student configuration:
- Programming language: ${language}
- Learning focus: ${focus}
- Depth: ${depth}
- Starting level: ${level}

Produce ${conceptCount} concepts and ${quizCount} multiple-choice quiz questions (4 options each, zero-based correctIndex). Order concepts so each builds on the previous. Calibrate explanations for a "${level}" learner.

STRICT code style rules for codeExample fields:
- All variable and function names MUST use lowerCamelCase.
- Raw source only — do NOT wrap in markdown fences.
- Use idiomatic, modern style for the requested language.

Return only the structured JSON matching the response schema.`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return jsonResponse({ error: "GEMINI_API_KEY is not configured" }, 500);

    const form = await req.formData();
    const file = form.get("file");
    const language = String(form.get("language") ?? "");
    const focus = String(form.get("focus") ?? "");
    const depth = String(form.get("depth") ?? "Intermediate");
    const level = String(form.get("level") ?? "Intermediate");

    if (!(file instanceof File)) return jsonResponse({ error: "Missing file." }, 400);
    if (!language || !focus) return jsonResponse({ error: "Missing required fields." }, 400);

    const ai = new GoogleGenAI({ apiKey });

    const uploaded = await ai.files.upload({
      file,
      config: { mimeType: file.type || "application/octet-stream", displayName: file.name },
    });

    if (!uploaded.uri || !uploaded.mimeType) {
      return jsonResponse({ error: "File upload to Gemini failed." }, 502);
    }

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent([
        createPartFromUri(uploaded.uri, uploaded.mimeType),
        buildPrompt(language, focus, depth, level),
      ]),
      config: {
        responseMimeType: "application/json",
        responseSchema: studyPlanSchema,
      },
    });

    const text = result.text;
    if (!text) return jsonResponse({ error: "Empty response from Gemini." }, 502);

    let plan: any;
    try {
      plan = JSON.parse(text);
    } catch {
      return jsonResponse({ error: "Malformed JSON from Gemini." }, 502);
    }

    ai.files.delete({ name: uploaded.name! }).catch(() => {});

    return jsonResponse({ plan });
  } catch (e) {
    console.error("generateStudyPlan error", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
