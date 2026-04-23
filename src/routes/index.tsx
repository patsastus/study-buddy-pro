import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, Sparkles, RotateCcw } from "lucide-react";
import { FileDropZone } from "@/components/FileDropZone";
import { StudyPlanView } from "@/components/StudyPlanView";
import { QuizzesView } from "@/components/QuizzesView";
import { extractTextFromFile } from "@/lib/extract-text";
import { supabase } from "@/lib/supabase";
import type { StudyPlan } from "@/lib/study-plan-types";

export const Route = createFileRoute("/")({
  component: Index,
});

type Depth = "Shallow" | "Intermediate" | "Deep";
type Level = "None" | "Beginner" | "Intermediate" | "Expert";

function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("Modern C++20");
  const [focus, setFocus] = useState(
    "Memory ownership, inheritance, smart pointers (RAII), for IO, for concurrency, and comparisons to older alternatives",
  );
  const [depth, setDepth] = useState<Depth>("Intermediate");
  const [level, setLevel] = useState<Level>("Intermediate");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [tab, setTab] = useState<"plan" | "quiz">("plan");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      const documentText = await extractTextFromFile(file);
      if (!documentText.trim()) {
        throw new Error("Could not read any text from the file.");
      }

      const { data, error: fnError } = await supabase.functions.invoke("generate-study-plan", {
        body: {
          documentText,
          fileName: file.name,
          language,
          focus,
          depth,
          level,
        },
      });

      if (fnError) {
        // Try to surface the server-provided error message.
        let message = fnError.message;
        try {
          const ctx = (fnError as unknown as { context?: { json?: () => Promise<{ error?: string }> } })
            .context;
          if (ctx?.json) {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(message || "Failed to generate study plan.");
      }
      if (!data?.plan) throw new Error("Empty response from server.");

      setPlan(data.plan as StudyPlan);
      setTab("plan");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setPlan(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg">Study Assistant</span>
          </div>
          {plan && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New plan
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {!plan ? (
          <SetupView
            file={file}
            setFile={setFile}
            language={language}
            setLanguage={setLanguage}
            focus={focus}
            setFocus={setFocus}
            depth={depth}
            setDepth={setDepth}
            level={level}
            setLevel={setLevel}
            isLoading={isLoading}
            error={error}
            onSubmit={handleSubmit}
          />
        ) : (
          <DashboardView plan={plan} tab={tab} setTab={setTab} />
        )}
      </main>
    </div>
  );
}

interface SetupProps {
  file: File | null;
  setFile: (f: File | null) => void;
  language: string;
  setLanguage: (v: string) => void;
  focus: string;
  setFocus: (v: string) => void;
  depth: Depth;
  setDepth: (v: Depth) => void;
  level: Level;
  setLevel: (v: Level) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
}

function SetupView(p: SetupProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl text-foreground">
          Turn any project brief into a personal study plan
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Upload a project description and we&apos;ll generate the concepts, examples and quizzes
          you need.
        </p>
      </div>

      <form onSubmit={p.onSubmit} className="space-y-6">
        <FileDropZone file={p.file} onFile={p.setFile} />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-5 font-serif text-lg text-foreground">Configure your plan</h2>

          <div className="space-y-5">
            <Field label="Programming language">
              <input
                type="text"
                value={p.language}
                onChange={(e) => p.setLanguage(e.target.value)}
                className="input-base"
                required
              />
            </Field>

            <Field label="Learning focus">
              <textarea
                value={p.focus}
                onChange={(e) => p.setFocus(e.target.value)}
                rows={3}
                className="input-base resize-none"
                required
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Depth">
                <select
                  value={p.depth}
                  onChange={(e) => p.setDepth(e.target.value as Depth)}
                  className="input-base"
                >
                  <option>Shallow</option>
                  <option>Intermediate</option>
                  <option>Deep</option>
                </select>
              </Field>

              <Field label="Starting level">
                <select
                  value={p.level}
                  onChange={(e) => p.setLevel(e.target.value as Level)}
                  className="input-base"
                >
                  <option>None</option>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Expert</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        {p.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {p.error}
          </div>
        )}

        <button
          type="submit"
          disabled={!p.file || p.isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-medium text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {p.isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating your plan…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate study plan
            </>
          )}
        </button>
      </form>

      <style>{`
        .input-base {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--background);
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: var(--foreground);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-base:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 15%, transparent);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function DashboardView({
  plan,
  tab,
  setTab,
}: {
  plan: StudyPlan;
  tab: "plan" | "quiz";
  setTab: (t: "plan" | "quiz") => void;
}) {
  return (
    <div>
      <div className="mb-6 inline-flex rounded-lg border border-border bg-card p-1 shadow-soft">
        <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
          Study Plan
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {plan.concepts.length}
          </span>
        </TabButton>
        <TabButton active={tab === "quiz"} onClick={() => setTab("quiz")}>
          Quizzes
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {plan.quizzes.length}
          </span>
        </TabButton>
      </div>

      {tab === "plan" ? <StudyPlanView plan={plan} /> : <QuizzesView quizzes={plan.quizzes} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
