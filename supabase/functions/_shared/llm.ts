// deno-lint-ignore-file no-explicit-any
// Shared LLM adapter for Lovable Cloud edge functions.
//
// Slice 1 scope: Gemini-only implementation, behavior-equivalent to the
// previous direct usage of @google/genai in each edge function.
// Future slices will add openai / anthropic / openrouter branches and
// per-request provider+apiKey selection.

import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "npm:@google/genai@^1.0.0";

export type Provider = "gemini" | "openai" | "anthropic" | "openrouter";

export interface AdapterFile {
  /** Raw file from multipart/form-data. */
  file: File;
}

export interface GenerateStructuredOptions {
  provider?: Provider; // default "gemini"
  model?: string; // default "gemini-2.5-flash"
  /** User-supplied API key. If empty, falls back to GEMINI_API_KEY for gemini. */
  apiKey?: string;
  prompt: string;
  /** JSON schema in the shape expected by @google/genai (Type-based). */
  schema: any;
  /** Optional file attachment (e.g. a PDF brief). */
  attachment?: AdapterFile;
  /** Optional fallback model chain (tried in order on 429/500/503). */
  modelFallbacks?: string[];
}

export interface GenerateTextOptions {
  provider?: Provider; // default "gemini"
  model?: string; // default "gemini-2.5-flash"
  apiKey?: string;
  prompt: string;
}

export class AdapterError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status = 500, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function resolveGeminiKey(apiKey?: string): string {
  const key = (apiKey && apiKey.trim()) || Deno.env.get("GEMINI_API_KEY") || "";
  if (!key) {
    throw new AdapterError("GEMINI_API_KEY is not configured", 500);
  }
  return key;
}

/**
 * Generate a structured (JSON) response, optionally grounded in an uploaded file.
 * Returns the parsed JSON object.
 */
export async function generateStructured(
  opts: GenerateStructuredOptions,
): Promise<any> {
  const provider = opts.provider ?? "gemini";

  if (provider !== "gemini") {
    // Slice 1: only gemini is implemented. Future slices will add the others.
    throw new AdapterError(
      `Provider "${provider}" is not supported yet.`,
      400,
    );
  }

  const apiKey = resolveGeminiKey(opts.apiKey);
  const ai = new GoogleGenAI({ apiKey });

  let contents: any;
  let uploadedName: string | undefined;

  if (opts.attachment) {
    const { file } = opts.attachment;
    const uploaded = await ai.files.upload({
      file,
      config: {
        mimeType: file.type || "application/octet-stream",
        displayName: file.name,
      },
    });
    if (!uploaded.uri || !uploaded.mimeType) {
      throw new AdapterError("File upload to Gemini failed.", 502);
    }
    uploadedName = uploaded.name ?? undefined;
    contents = createUserContent([
      createPartFromUri(uploaded.uri, uploaded.mimeType),
      opts.prompt,
    ]);
  } else {
    contents = opts.prompt;
  }

  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: opts.schema,
  };

  const primary = opts.model ?? "gemini-2.5-flash";
  const modelChain = [primary, ...(opts.modelFallbacks ?? [])];

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
        if (status !== 503 && status !== 429 && status !== 500) {
          // Non-retryable: bail immediately.
          throw err;
        }
        await sleep(600 * Math.pow(2, attempt));
      }
    }
  }

  // Best-effort cleanup of the uploaded file.
  if (uploadedName) {
    ai.files.delete({ name: uploadedName }).catch(() => {});
  }

  if (lastError) {
    const detail = lastError instanceof Error ? lastError.message : String(lastError);
    throw new AdapterError(
      "The AI model is overloaded right now. Please try again in a moment.",
      503,
      detail,
    );
  }

  const text = result.text;
  if (!text) throw new AdapterError("Empty response from model.", 502);

  try {
    return JSON.parse(text);
  } catch {
    throw new AdapterError("Malformed JSON from model.", 502);
  }
}

/**
 * Generate a free-form text response. Returns trimmed string.
 * Used by reExplainConcept and evaluateAnswer (which then JSON.parses
 * the model's text on its own).
 */
export async function generateText(opts: GenerateTextOptions): Promise<string> {
  const provider = opts.provider ?? "gemini";

  if (provider !== "gemini") {
    throw new AdapterError(
      `Provider "${provider}" is not supported yet.`,
      400,
    );
  }

  const apiKey = resolveGeminiKey(opts.apiKey);
  const ai = new GoogleGenAI({ apiKey });

  const result = await ai.models.generateContent({
    model: opts.model ?? "gemini-2.5-flash",
    contents: opts.prompt,
  });

  const text = result.text?.trim();
  if (!text) throw new AdapterError("Empty response from model.", 502);
  return text;
}
