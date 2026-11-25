import { useCallback, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RewardScreen } from "@/components/RewardScreen";
import { cn } from "@/lib/utils";
import { LEVELS, SUBJECTS, type Level, type Subject, type TaskQuestion } from "@/lib/tasks/questions";
import { completeTaskRound, createTaskRound, MINUTES_PER_CORRECT, TASK_DAILY_LIMIT, type TaskRoundResult } from "@/lib/tasks/rewards";

interface Round {
  id: string;
  startedAt: Date;
  questions: TaskQuestion[];
}

const newRound = (subject: Subject, level: Level): Round => ({
  id: crypto.randomUUID(),
  startedAt: new Date(),
  questions: createTaskRound(subject, level),
});

/** One round of tasks in focus mode (no tab bar): questions, saving, then the reward screen. */
export function TaskSession({ subject, level, onExit, onSaved, onHome }: {
  subject: Subject;
  level: Level;
  onExit: () => void;
  onSaved: (result: TaskRoundResult) => void;
  onHome: () => void;
}) {
  const [round, setRound] = useState(() => newRound(subject, level));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<"question" | "saving" | "error" | "done">("question");
  const [result, setResult] = useState<TaskRoundResult | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const total = round.questions.length;
  const question = round.questions[index];
  const answered = selected !== null;
  const isLast = index === total - 1;

  const save = useCallback(async () => {
    setPhase("saving");
    try {
      const saved = await completeTaskRound({ id: round.id, subject, level, correct, total, startedAt: round.startedAt });
      setResult(saved);
      onSaved(saved);
      setPhase("done");
    } catch (error) {
      console.error("Kunde inte spara uppgifterna:", error);
      setPhase("error");
    }
  }, [round, subject, level, correct, total, onSaved]);

  const answer = (option: number) => {
    if (answered) return;
    setSelected(option);
    if (option === question.answer) setCorrect((value) => value + 1);
  };

  const next = () => {
    if (isLast) { void save(); return; }
    setIndex((value) => value + 1);
    setSelected(null);
  };

  const again = () => {
    setRound(newRound(subject, level));
    setIndex(0);
    setSelected(null);
    setCorrect(0);
    setResult(null);
    setPhase("question");
  };

  const exit = () => (index > 0 || answered ? setConfirmExit(true) : onExit());

  if (phase === "done" && result) {
    const limitHit = result.earnedMinutes < correct * MINUTES_PER_CORRECT;
    return (
      <RewardScreen
        title={correct === total ? "Alla rätt!" : correct >= Math.ceil(total / 2) ? "Bra jobbat!" : "Bra kämpat!"}
        minutes={result.earnedMinutes}
        details={`${correct} av ${total} rätt · ${SUBJECTS[subject].title}, ${LEVELS[level].title.toLowerCase()}`}
        note={limitHit ? `Du har nått dagens gräns på ${TASK_DAILY_LIMIT} min för uppgifter.` : undefined}
        balance={result.balance}
        primary={limitHit ? { label: "Till min skärmtid", onClick: onHome } : { label: "En runda till", onClick: again }}
        secondary={{ label: "Klar", onClick: onExit }}
      />
    );
  }

  if (phase === "saving" || phase === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-5 text-center">
        {phase === "saving" ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <p role="status" className="font-semibold">Sparar…</p>
          </>
        ) : (
          <>
            <p role="alert" className="font-display text-xl font-bold">Kunde inte spara resultatet</p>
            <p className="text-sm text-muted-foreground">Kontrollera att du är uppkopplad och försök igen. Du får inte minuterna dubbelt.</p>
            <Button className="h-14 w-full max-w-sm text-base" onClick={() => void save()}>Försök igen</Button>
            <Button variant="ghost" className="h-12 w-full max-w-sm" onClick={onExit}>Avbryt</Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="header-safe px-5">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Button variant="ghost" size="icon" className="-ml-2 h-11 w-11 shrink-0" aria-label="Avsluta uppgifterna" onClick={exit}>
            <X className="h-5 w-5" />
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {SUBJECTS[subject].title} · {LEVELS[level].title}
          </p>
          <p className="font-display font-bold tabular-nums text-reward">
            +<span aria-label="Rätta svar hittills">{correct * MINUTES_PER_CORRECT}</span> min
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-4">
        <p className="text-sm font-semibold text-muted-foreground">Fråga {index + 1} av {total}</p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Frågor besvarade"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + (answered ? 1 : 0)}
        >
          <div className="h-full rounded-full bg-reward transition-[width]" style={{ width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }} />
        </div>

        <h1 className="mt-8 font-display text-2xl font-bold leading-snug">{question.prompt}</h1>

        <ul className="mt-6 space-y-3">
          {question.options.map((option, optionIndex) => {
            const isAnswer = optionIndex === question.answer;
            const isChosen = optionIndex === selected;
            return (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => answer(optionIndex)}
                  disabled={answered}
                  aria-pressed={isChosen}
                  className={cn(
                    "flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left text-lg font-semibold transition-colors",
                    !answered && "border-border hover:border-primary/50 active:scale-[0.99]",
                    answered && isAnswer && "border-reward bg-reward/15",
                    answered && isChosen && !isAnswer && "border-danger bg-danger/10",
                    answered && !isAnswer && !isChosen && "border-border opacity-60",
                  )}
                >
                  {option}
                  {answered && isAnswer && <Check className="h-5 w-5 shrink-0 text-reward" aria-label="Rätt svar" />}
                  {answered && isChosen && !isAnswer && <X className="h-5 w-5 shrink-0 text-destructive" aria-label="Ditt svar" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div aria-live="polite" className="mt-5 min-h-12">
          {answered && (
            <p className="text-base">
              <span className={cn("font-bold", selected === question.answer ? "text-reward" : "text-destructive")}>
                {selected === question.answer ? `Rätt! +${MINUTES_PER_CORRECT} min` : `Inte riktigt. Rätt svar: ${question.options[question.answer]}.`}
              </span>
              {question.explanation && <span className="mt-1 block text-sm text-muted-foreground">{question.explanation}</span>}
            </p>
          )}
        </div>

        <div className="mt-auto pt-6 bottom-bar-safe">
          {answered && (
            <Button className="h-14 w-full font-display text-base font-bold" onClick={next}>
              {isLast ? "Se resultat" : "Nästa fråga"}
            </Button>
          )}
        </div>
      </main>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta uppgifterna?</AlertDialogTitle>
            <AlertDialogDescription>Du får inga minuter för den här rundan om du avslutar nu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt svara</AlertDialogCancel>
            <AlertDialogAction onClick={onExit} className="bg-danger text-danger-foreground hover:bg-danger/90">Avsluta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
