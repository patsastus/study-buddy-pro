import { useState } from "react";
import type { StudyPlan } from "@/lib/study-plan-types";
import { ChevronDown } from "lucide-react";

export function StudyPlanView({ plan }: { plan: StudyPlan }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div>
      <div className="mb-6 rounded-xl border border-border bg-primary-soft/60 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">
          Project summary
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{plan.projectSummary}</p>
      </div>

      <div className="space-y-3">
        {plan.concepts.map((concept, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="font-serif text-lg text-foreground">{concept.name}</h3>
                </div>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-border px-5 pb-5 pt-4">
                  <div className="prose-content space-y-3 text-sm leading-relaxed text-foreground">
                    {concept.explanation.split("\n").map((para, j) =>
                      para.trim() ? (
                        <p key={j} className="whitespace-pre-wrap">
                          {para}
                        </p>
                      ) : null,
                    )}
                  </div>
                  {concept.codeExample && (
                    <pre className="bg-code mt-4 overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
                      <code>{concept.codeExample}</code>
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
