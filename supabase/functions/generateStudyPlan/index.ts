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
          importance: { type: Type.STRING, enum: ["Core", "Useful", "Advanced"] },
          explanation: { type: Type.STRING },
          codeExample: { type: Type.STRING },
          quickCheck: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ["question", "options", "correctIndex", "explanation"],
          },
          miniTask: {
            type: Type.OBJECT,
            properties: {
              instruction: { type: Type.STRING },
              solution: { type: Type.STRING },
            },
            required: ["instruction", "solution"],
          },
          spotTheBug: {
            type: Type.OBJECT,
            properties: {
              buggyCode: { type: Type.STRING },
              fixedCode: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["buggyCode", "fixedCode", "explanation"],
          },
        },
        required: [
          "name",
          "importance",
          "explanation",
          "codeExample",
          "quickCheck",
          "miniTask",
          "spotTheBug",
        ],
      },
    },
  },
  required: ["projectSummary", "concepts"],
};

const buildPrompt = (
  language: string,
  focus: string,
  depth: string,
  level: string,
) => {
  const conceptCount =
    depth === "Shallow" ? "5-7" : depth === "Intermediate" ? "8-10" : "11-14";

  return `You are an expert programming tutor. Read the attached project brief and design a personalised study plan.

Student configuration:
- Programming language: ${language}
- Learning focus: ${focus}
- Depth: ${depth}
- Starting level: ${level}

Produce ${conceptCount} concepts. Order them so each builds on the previous. Calibrate everything for a "${level}" learner.

For EACH concept include:
- name: short title
- importance: one of "Core", "Useful", "Advanced"
- explanation: 3-5 sentences MAXIMUM, concise and adapted to the level
- codeExample: small idiomatic snippet illustrating the concept
- quickCheck: one short multiple-choice question with 3-4 options, zero-based correctIndex, and a 1-2 sentence explanation
- miniTask: a single 1-2 line practical instruction the learner can do, plus a sample solution snippet
- spotTheBug: a short snippet containing one realistic mistake related to the concept, the corrected version, and a 1-2 sentence explanation of the bug

STRICT code style rules for ALL code fields (codeExample, miniTask.solution, spotTheBug.buggyCode, spotTheBug.fixedCode):
- Variable and function names MUST use lowerCamelCase.
- Raw source only — no markdown fences.
- Idiomatic, modern style for the requested language.

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

    const contents = createUserContent([
      createPartFromUri(uploaded.uri, uploaded.mimeType),
      buildPrompt(language, focus, depth, level),
    ]);

    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: studyPlanSchema,
    };

    const modelChain = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let result: any;
    let lastError: unknown;
    outer: for (const model of modelChain) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          result = await ai.models.generateContent({
            model,
            contents,
            config: generationConfig,
          });
          lastError = undefined;
          break outer;
        } catch (err: any) {
          lastError = err;
          const status = err?.status ?? err?.response?.status;
          if (status !== 503 && status !== 429 && status !== 500) throw err;
          await sleep(600 * Math.pow(2, attempt));
        }
      }
    }

    if (lastError) {
      const message = lastError instanceof Error ? lastError.message : String(lastError);
      return jsonResponse(
        { error: "The AI model is overloaded right now. Please try again in a moment.", detail: message },
        503,
      );
    }

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
