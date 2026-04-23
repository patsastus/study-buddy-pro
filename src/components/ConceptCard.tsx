import { useState } from "react";
import { Check, X, Loader2, Lightbulb, Sparkles, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type {
  StudyConcept,
  ConceptImportance,
  ReExplainStyle,
} from "@/lib/study-plan-types";

interface ConceptCardProps {
  concept: StudyConcept;
  index: number;
  total: number;
  language: string;
  level: string;
  isOpen: boolean;
  isDone: boolean;
  onToggle: () => void;
  onMarkDone: () => void;
  onInteract: () => void;
}

interface ExtraExplanation {
  style: ReExplainStyle;
  text: string;
}

const importanceMeta: Record<ConceptImportance, { emoji: string; label: string; cls: string }> = {
  Core: {
    emoji: "🟢",
    label: "Core",
    cls: "bg-[oklch(0.94_0.08_150)] text-[oklch(0.35_0.12_150)]",
  },
  Useful: {
    emoji: "🟡",
    label: "Useful",
    cls: "bg-[oklch(0.94_0.1_85)] text-[oklch(0.4_0.12_70)]",
  },
  Advanced: {
    emoji: "🔴",
    label: "Advanced",
    cls: "bg-[oklch(0.94_0.08_25)] text-[oklch(0.45_0.18_25)]",
  },
};

const styleLabels: Record<ReExplainStyle, { label: string; emoji: string }> = {
  simpler: { label: "Explain simpler", emoji: "🧒" },
  analogy: { label: "Analogy", emoji: "💡" },
  deeper: { label: "Go deeper", emoji: "🔬" },
};

export function ConceptCard(props: ConceptCardProps) {
  const { concept, index, total, isOpen, isDone, onToggle, onMarkDone, onInteract } = props;
  const meta = importanceMeta[concept.importance] ?? importanceMeta.Core;

  const [extras, setExtras] = useState<ExtraExplanation[]>([]);
  const [loadingStyle, setLoadingStyle] = useState<ReExplainStyle | null>(null);
  const [reExplainError, setReExplainError] = useState<string | null>(null);

  const [quickPick, setQuickPick] = useState<number | null>(null);
  const [quickChecked, setQuickChecked] = useState(false);

  const [showSolution, setShowSolution] = useState(false);
  const [showBugFix, setShowBugFix] = useState(false);

  async function handleReExplain(style: ReExplainStyle) {
    if (loadingStyle) return;
    setLoadingStyle(style);
    setReExplainError(null);
    onInteract();
    try {
      const { data, error } = await supabase.functions.invoke("reExplainConcept", {
        body: {
          conceptName: concept.name,
          originalExplanation: concept.explanation,
          language: props.language,
          level: props.level,
          style,
        },
      });
      if (error) throw error;
      if (!data?.explanation) throw new Error("Empty response.");
      setExtras((prev) => [...prev, { style, text: data.explanation as string }]);
    } catch (e) {
      setReExplainError(e instanceof Error ? e.message : "Failed to re-explain.");
    } finally {
      setLoadingStyle(null);
    }
  }

  function handleQuickSelect(i: number) {
    if (quickChecked) return;
    setQuickPick(i);
    setQuickChecked(true);
    onInteract();
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-card shadow-soft transition-colors ${
        isDone ? "border-primary/40" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-accent/30"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
              isDone
                ? "bg-primary text-primary-foreground"
                : "bg-primary-soft text-primary"
            }`}
          >
            {isDone ? <Check className="h-4 w-4" /> : index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-lg text-foreground">{concept.name}</h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Concept {index + 1} of {total}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="space-y-6 border-t border-border px-5 pb-6 pt-5">
          <Section>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {concept.explanation}
            </p>
            {concept.codeExample && (
              <pre className="bg-code mt-4 overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
                <code>{concept.codeExample}</code>
              </pre>
            )}
          </Section>

          <Section>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(styleLabels) as ReExplainStyle[]).map((s) => {
                const isLoading = loadingStyle === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleReExplain(s)}
                    disabled={loadingStyle !== null}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>{styleLabels[s].emoji}</span>
                    )}
                    {styleLabels[s].label}
                  </button>
                );
              })}
            </div>
            {reExplainError && (
              <p className="mt-2 text-xs text-destructive">{reExplainError}</p>
            )}
            {extras.length > 0 && (
              <div className="mt-4 space-y-3">
                {extras.map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-primary-soft/40 p-3 text-sm leading-relaxed text-foreground"
                  >
                    <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Sparkles className="h-3 w-3" />
                      {styleLabels[ex.style].label}
                    </div>
                    <p className="whitespace-pre-wrap">{ex.text}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <SectionHeader emoji="🎯" title="Quick Check" />
          <Section>
            <p className="text-sm font-medium text-foreground">{concept.quickCheck.question}</p>
            <div className="mt-3 space-y-2">
              {concept.quickCheck.options.map((opt, i) => {
                const isPicked = quickPick === i;
                const isAnswer = i === concept.quickCheck.correctIndex;
                let cls = "border-border hover:border-primary/40 hover:bg-accent/30";
                if (quickChecked && isAnswer) cls = "border-primary bg-primary-soft";
                else if (quickChecked && isPicked) cls = "border-destructive bg-destructive/10";
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickSelect(i)}
                    disabled={quickChecked}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-default ${cls}`}
                  >
                    <span className="flex-1">{opt}</span>
                    {quickChecked && isAnswer && <Check className="h-4 w-4 text-primary" />}
                    {quickChecked && isPicked && !isAnswer && (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                  </button>
                );
              })}
            </div>
            {quickChecked && (
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <span
                  className={`font-medium ${
                    quickPick === concept.quickCheck.correctIndex
                      ? "text-primary"
                      : "text-destructive"
                  }`}
                >
                  {quickPick === concept.quickCheck.correctIndex ? "✅ Correct! " : "❌ Not quite. "}
                </span>
                {concept.quickCheck.explanation}
              </div>
            )}
          </Section>

          <SectionHeader emoji="💻" title="Mini Task" />
          <Section>
            <p className="text-sm leading-relaxed text-foreground">
              {concept.miniTask.instruction}
            </p>
            <AnswerBox
              kind="miniTask"
              concept={concept}
              language={props.language}
              level={props.level}
              onInteract={onInteract}
              showSolution={showSolution}
              onShowSolution={() => {
                setShowSolution(true);
                onInteract();
              }}
              solutionText={concept.miniTask.solution}
              placeholder="Write your code here..."
            />
          </Section>

          <SectionHeader emoji="🐞" title="Spot the Bug" />
          <Section>
            <p className="text-sm text-muted-foreground">What&apos;s wrong here?</p>
            <pre className="bg-code mt-2 overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
              <code>{concept.spotTheBug.buggyCode}</code>
            </pre>
            <AnswerBox
              kind="spotTheBug"
              concept={concept}
              language={props.language}
              level={props.level}
              onInteract={onInteract}
              showSolution={showBugFix}
              onShowSolution={() => {
                setShowBugFix(true);
                onInteract();
              }}
              solutionText={concept.spotTheBug.fixedCode}
              extraExplanation={concept.spotTheBug.explanation}
              placeholder="What's wrong? Fix or explain it..."
            />
          </Section>

          <div className="flex items-center justify-end border-t border-border pt-4">
            <button
              type="button"
              onClick={onMarkDone}
              disabled={isDone}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isDone
                  ? "bg-primary-soft text-primary cursor-default"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              <Check className="h-4 w-4" />
              {isDone ? "Completed" : "Mark as done"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-2 border-t border-border pt-5">
      <span className="text-base">{emoji}</span>
      <h4 className="font-heading text-base text-foreground">{title}</h4>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

type Verdict = "correct" | "partial" | "incorrect";

interface AnswerBoxProps {
  kind: "miniTask" | "spotTheBug";
  concept: StudyConcept;
  language: string;
  level: string;
  onInteract: () => void;
  showSolution: boolean;
  onShowSolution: () => void;
  solutionText: string;
  extraExplanation?: string;
  placeholder: string;
}

function AnswerBox(p: AnswerBoxProps) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (!answer.trim() || loading) return;
    setLoading(true);
    setError(null);
    setVerdict(null);
    setFeedback(null);
    p.onInteract();
    try {
      const payload =
        p.kind === "miniTask"
          ? {
              kind: "miniTask",
              conceptName: p.concept.name,
              language: p.language,
              level: p.level,
              userAnswer: answer,
              instruction: p.concept.miniTask.instruction,
              solution: p.concept.miniTask.solution,
            }
          : {
              kind: "spotTheBug",
              conceptName: p.concept.name,
              language: p.language,
              level: p.level,
              userAnswer: answer,
              buggyCode: p.concept.spotTheBug.buggyCode,
              fixedCode: p.concept.spotTheBug.fixedCode,
              bugExplanation: p.concept.spotTheBug.explanation,
            };

      const { data, error: fnError } = await supabase.functions.invoke("evaluateAnswer", {
        body: payload,
      });
      if (fnError) throw fnError;
      if (!data?.verdict) throw new Error("Empty response.");
      setVerdict(data.verdict as Verdict);
      setFeedback(data.feedback as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to evaluate.");
    } finally {
      setLoading(false);
    }
  }

  const verdictMeta: Record<Verdict, { emoji: string; label: string; cls: string }> = {
    correct: {
      emoji: "👌",
      label: "Nice, this works",
      cls: "border-primary/40 bg-primary-soft text-foreground",
    },
    partial: {
      emoji: "🟡",
      label: "Almost there",
      cls: "border-[oklch(0.7_0.15_85)]/40 bg-[oklch(0.94_0.1_85)]/40 text-foreground",
    },
    incorrect: {
      emoji: "🔁",
      label: "Not quite",
      cls: "border-destructive/30 bg-destructive/10 text-foreground",
    },
  };

  return (
    <div className="mt-3 space-y-3">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        spellCheck={false}
        placeholder={p.placeholder}
        className="w-full rounded-lg border border-border bg-code px-3 py-2 font-mono text-xs leading-relaxed text-[var(--code-fg)] outline-none focus:border-primary"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCheck}
          disabled={loading || !answer.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Check answer
        </button>
        {!p.showSolution && (
          <button
            type="button"
            onClick={p.onShowSolution}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Show solution
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {verdict && feedback && (
        <div className={`rounded-lg border p-3 text-sm ${verdictMeta[verdict].cls}`}>
          <div className="mb-1 text-xs font-medium">
            {verdictMeta[verdict].emoji} {verdictMeta[verdict].label}
          </div>
          <p className="whitespace-pre-wrap">{feedback}</p>
        </div>
      )}

      {p.showSolution && (
        <div className="space-y-2">
          {p.extraExplanation && (
            <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
              <span className="font-medium">The bug: </span>
              {p.extraExplanation}
            </div>
          )}
          <p className="text-xs font-medium text-muted-foreground">
            {p.kind === "miniTask" ? "Example solution" : "Fixed version"}
          </p>
          <pre className="bg-code overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
            <code>{p.solutionText}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
