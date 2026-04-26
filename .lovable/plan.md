# Bring-Your-Own-Key + Model Picker

## On the provider question

There is no Lovable/Supabase limitation forcing a provider list — edge functions are plain Deno and can `fetch` any HTTPS endpoint. Practical reasons to limit choice:

1. **Different SDKs / response shapes.** Today the function uses `@google/genai` for Gemini's structured-output (`responseSchema`) and Files API (PDF upload). OpenAI, Anthropic, Mistral, Groq, OpenRouter, etc. each have their own SDK, their own way of doing JSON-schema output, and their own way of accepting PDFs (most need the file converted to text or images first). Each provider added = one more code path to maintain.
2. **PDF handling.** Gemini natively ingests PDFs. OpenAI/Anthropic accept PDFs via their files API too, but Mistral/Groq/most others do not — you'd need to extract text server-side first.
3. **Structured output.** Gemini, OpenAI, and Anthropic all support reliable JSON schema / tool calling. Smaller providers often don't, which means fragile prompt-only JSON.

**Recommended starter set: Gemini, OpenAI, Anthropic, plus an "OpenRouter" option.** OpenRouter is one API key that proxies to ~hundreds of models (Llama, DeepSeek, Mistral, Qwen, …) using the OpenAI-compatible schema — so it gives the user "maximum choice" for the cost of one extra adapter. We can add more direct providers later if needed.

## What changes

### 1. Frontend: provider + model + key UI (per-session)

In `src/routes/index.tsx`, add a new collapsible "AI provider" panel inside `SetupView` (above "Configure your plan"):

- **Provider dropdown** — Gemini (default), OpenAI, Anthropic, OpenRouter, "Use built-in key".
- **Model dropdown** — populated from a per-provider list (see below). Default per provider.
- **API key input** (`type="password"`, with show/hide toggle) — only shown when provider ≠ "Use built-in key". Placeholder explains where to get the key. Helper text: *"Stored only for this browser tab. Cleared on refresh."*
- State lives in `useState` in `Index()` — not localStorage, not context. Gets cleared on reload by definition.
- The same `provider` + `model` + `userApiKey` are passed to `ConceptCard` so the in-card "re-explain" / "check answer" calls use the same settings.

Model lists (initial):
- **Gemini**: `gemini-2.5-pro`, `gemini-2.5-flash` (default), `gemini-2.5-flash-lite`, `gemini-3-pro-preview`, `gemini-3-flash-preview`
- **OpenAI**: `gpt-5`, `gpt-5-mini` (default), `gpt-5-nano`, `gpt-4o`
- **Anthropic**: `claude-sonnet-4-5` (default), `claude-opus-4-1`, `claude-haiku-4-5`
- **OpenRouter**: free-text input (lots of options) with a few suggestions

### 2. Edge functions: provider adapter

Create `supabase/functions/_shared/llm.ts` exporting:

```ts
generateStructured({ provider, model, apiKey, file?, prompt, schema }): Promise<object>
generateText({ provider, model, apiKey, prompt }): Promise<string>
```

Internally branches per provider:
- **gemini** — current `@google/genai` code path (Files API + `responseSchema`).
- **openai** — `chat.completions` with `response_format: { type: "json_schema", … }`. PDF goes through OpenAI's files endpoint, then referenced as input.
- **anthropic** — `messages.create` with tool-use forced for JSON. PDFs sent as `document` content blocks (base64).
- **openrouter** — OpenAI-compatible schema; PDFs **not supported**, so server extracts text from the PDF first (use `pdf-parse` via npm specifier) and passes as plain text. UI warns when this provider is selected with a PDF.

All three existing functions (`generateStudyPlan`, `evaluateAnswer`, `reExplainConcept`) are refactored to call the shared adapter instead of `@google/genai` directly.

### 3. Key fallback logic

Each function reads `provider`, `model`, and `apiKey` from the request:
- If `apiKey` is empty **and** `provider === "gemini"` (or the special "built-in" choice), fall back to `Deno.env.get("GEMINI_API_KEY")`.
- Otherwise require the user-supplied key; return `400 { error: "Missing API key for <provider>" }` if absent.
- Never log the key. Never echo it back.

### 4. Wire-through

- `generateStudyPlan`: accept `provider`, `model`, `apiKey` from FormData.
- `evaluateAnswer` / `reExplainConcept`: accept the same fields in the JSON body. Update `ConceptCard.tsx` to pass them on every invoke.
- All three functions still accept the call without these fields and default to Gemini + built-in key, so existing behavior is unchanged.

### 5. Small UX touches

- Inline link next to each provider with where to get a key (e.g. *"Get a Gemini key →"*).
- Disable the "Generate" button with a tooltip if a non-built-in provider is selected and the key field is empty.
- Toast / inline error mapping: surface `401` from providers as *"Invalid API key for {provider}."* and `429` as *"Rate-limited by {provider} — try again shortly."*

## Files touched

- `src/routes/index.tsx` — new state, new "AI provider" panel, pass settings into dashboard.
- `src/components/ConceptCard.tsx` — accept and forward `provider`/`model`/`apiKey` on its two `supabase.functions.invoke` calls.
- `supabase/functions/_shared/llm.ts` — **new**, provider adapters.
- `supabase/functions/generateStudyPlan/index.ts` — use adapter, accept new fields.
- `supabase/functions/evaluateAnswer/index.ts` — same.
- `supabase/functions/reExplainConcept/index.ts` — same.

## Out of scope (call out so we agree)

- No persistence of keys (no DB, no auth, no localStorage) — explicit per your choice.
- No streaming changes — current functions are non-streaming; that stays.
- No cost/usage tracking per provider.
- Image/voice models not exposed in the picker (this app only does text + PDF in).
