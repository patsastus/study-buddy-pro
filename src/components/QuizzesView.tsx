import { useState } from "react";
import type { StudyQuiz } from "@/lib/study-plan-types";
import { Check, X } from "lucide-react";

export function QuizzesView({ quizzes }: { quizzes: StudyQuiz[] }) {
  return (
    <div className="space-y-5">
      {quizzes.map((q, i) => (
        <QuizCard key={i} quiz={q} index={i} />
      ))}
    </div>
  );
}

function QuizCard({ quiz, index }: { quiz: StudyQuiz; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = checked && selected === quiz.correctIndex;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-medium text-primary">
          {index + 1}
        </span>
        <h3 className="font-serif text-base leading-snug text-foreground">{quiz.question}</h3>
      </div>

      <div className="space-y-2">
        {quiz.options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrectOption = checked && i === quiz.correctIndex;
          const isWrongPick = checked && isSelected && i !== quiz.correctIndex;

          let stateClass = "border-border hover:border-primary/40 hover:bg-accent/30";
          if (isCorrectOption) stateClass = "border-primary bg-primary-soft";
          else if (isWrongPick) stateClass = "border-destructive bg-destructive/10";
          else if (isSelected && !checked) stateClass = "border-primary bg-primary-soft";

          return (
            <label
              key={i}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${stateClass}`}
            >
              <input
                type="radio"
                name={`quiz-${index}`}
                className="h-4 w-4 accent-[var(--primary)]"
                checked={isSelected}
                onChange={() => {
                  if (!checked) setSelected(i);
                }}
                disabled={checked}
              />
              <span className="flex-1 text-foreground">{option}</span>
              {isCorrectOption && <Check className="h-4 w-4 text-primary" />}
              {isWrongPick && <X className="h-4 w-4 text-destructive" />}
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {!checked ? (
          <button
            type="button"
            disabled={selected === null}
            onClick={() => setChecked(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check answer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setChecked(false);
              setSelected(null);
            }}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Try again
          </button>
        )}
        {checked && (
          <span
            className={`text-sm font-medium ${correct ? "text-primary" : "text-destructive"}`}
          >
            {correct ? "Correct!" : "Not quite."}
          </span>
        )}
      </div>

      {checked && (
        <div className="mt-3 rounded-lg bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Why: </span>
          {quiz.explanation}
        </div>
      )}
    </div>
  );
}
