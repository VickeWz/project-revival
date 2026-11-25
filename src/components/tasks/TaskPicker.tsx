import type { ComponentType } from "react";
import { BookOpen, Calculator, ChevronRight, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEVELS, SUBJECTS, type Level, type Subject } from "@/lib/tasks/questions";
import { MINUTES_PER_CORRECT, TASK_DAILY_LIMIT, TASK_ROUND_SIZE } from "@/lib/tasks/rewards";

const ICONS: Record<Subject, ComponentType<{ className?: string }>> = {
  matte: Calculator,
  svenska: BookOpen,
  engelska: Languages,
};

/** Uppgifter in Tjäna: today's progress, a level, and one tap on a subject starts a round. */
export function TaskPicker({ level, onLevelChange, earnedToday, onStart }: {
  level: Level;
  onLevelChange: (level: Level) => void;
  earnedToday: number | null;
  onStart: (subject: Subject) => void;
}) {
  const used = Math.min(TASK_DAILY_LIMIT, earnedToday ?? 0);
  const limitReached = used >= TASK_DAILY_LIMIT;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-reward/30 bg-reward/10 p-5">
        <h2 className="font-display text-lg font-bold">Lös {TASK_ROUND_SIZE} frågor</h2>
        <p className="text-sm text-muted-foreground">
          Varje rätt svar ger {MINUTES_PER_CORRECT} minut skärmtid, upp till {TASK_DAILY_LIMIT} min per dag.
        </p>
        <div className="mt-4 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-muted-foreground">Idag</span>
          <span className="font-display font-bold tabular-nums text-reward">+{used} av {TASK_DAILY_LIMIT} min</span>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Minuter från uppgifter idag"
          aria-valuemin={0}
          aria-valuemax={TASK_DAILY_LIMIT}
          aria-valuenow={used}
        >
          <div className="h-full rounded-full bg-reward transition-[width]" style={{ width: `${(used / TASK_DAILY_LIMIT) * 100}%` }} />
        </div>
        {limitReached && (
          <p className="mt-3 text-sm text-foreground">
            Du har nått dagens gräns. Du kan öva vidare, men det ger inga fler minuter idag. Rör på dig för mer tid!
          </p>
        )}
      </section>

      <fieldset className="space-y-2.5">
        <legend className="mb-2.5 font-display text-lg font-semibold">Nivå</legend>
        <div role="radiogroup" aria-label="Nivå" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
          {([1, 2, 3] as Level[]).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={level === value}
              onClick={() => onLevelChange(value)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-sm font-semibold transition-colors",
                level === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {LEVELS[value].title}
              <span className="text-[11px] font-medium text-muted-foreground">{LEVELS[value].grades}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <section aria-labelledby="subjects-heading" className="space-y-3">
        <h2 id="subjects-heading" className="font-display text-lg font-semibold">Välj ämne</h2>
        <ul className="space-y-3">
          {(Object.keys(SUBJECTS) as Subject[]).map((subject) => {
            const Icon = ICONS[subject];
            return (
              <li key={subject}>
                <button
                  type="button"
                  onClick={() => onStart(subject)}
                  className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40 active:scale-[0.98]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-reward text-reward-foreground">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-bold">{SUBJECTS[subject].title}</span>
                    <span className="block text-sm text-muted-foreground">{SUBJECTS[subject].description}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
