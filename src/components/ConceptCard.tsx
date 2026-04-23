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
            <div className="mt-3">
              {!showSolution ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowSolution(true);
                    onInteract();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Show solution
                </button>
              ) : (
                <pre className="bg-code overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
                  <code>{concept.miniTask.solution}</code>
                </pre>
              )}
            </div>
          </Section>

          <SectionHeader emoji="🐞" title="Spot the Bug" />
          <Section>
            <p className="text-sm text-muted-foreground">What&apos;s wrong here?</p>
            <pre className="bg-code mt-2 overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
              <code>{concept.spotTheBug.buggyCode}</code>
            </pre>
            {!showBugFix ? (
              <button
                type="button"
                onClick={() => {
                  setShowBugFix(true);
                  onInteract();
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
              >
                Reveal answer
              </button>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
                  <span className="font-medium">The bug: </span>
                  {concept.spotTheBug.explanation}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Fixed version</p>
                  <pre className="bg-code overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
                    <code>{concept.spotTheBug.fixedCode}</code>
                  </pre>
                </div>
              </div>
            )}
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
