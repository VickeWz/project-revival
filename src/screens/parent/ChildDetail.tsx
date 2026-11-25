import { useState, type ReactNode } from "react";
import { useActivityGoal } from "@/hooks/useActivityGoal";
import { ActivityGoalModal } from "@/components/settings/ActivityGoalModal";
import { format, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import { Brain, CirclePlus, Footprints, Loader2, LockKeyhole } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppScreen } from "@/components/layout/AppScreen";
import { Initial } from "@/components/Initial";
import { UnlockStatus } from "@/components/parent/UnlockStatus";
import { formatPassDistance } from "@/lib/pass-metrics";
import { cn } from "@/lib/utils";
import { localDay, useChildWeek, type LinkedChild } from "@/hooks/useParentOverview";

interface ChildDetailProps {
  child: LinkedChild;
  refreshKey: number;
  onBack: () => void;
  onGive: () => void;
  onRemove: () => void;
}

// "Elias" → "Elias iPhone", "Test Kid" → "Test Kids iPhone".
const genitive = (name: string) => (/[sxz]$/i.test(name) ? name : `${name}s`);

/** One child for the parent: balance and giving time, today, the last seven days and the rules. */
export function ChildDetail({ child, refreshKey, onBack, onGive, onRemove }: ChildDetailProps) {
  const { dailyStepGoal, updateGoal, loading: goalLoading, error: goalError } = useActivityGoal(child.id);
  const [goalOpen, setGoalOpen] = useState(false);
  const { days, loading } = useChildWeek(child.id, refreshKey);
  const today = localDay(new Date());
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = subDays(new Date(), 6 - index);
    const key = localDay(date);
    return {
      key,
      label: index === 6 ? "idag" : format(date, "EEE", { locale: sv }).replace(".", ""),
      earned: days.find((day) => day.day === key)?.earned ?? 0,
    };
  });
  const maxEarned = Math.max(1, ...week.map((day) => day.earned));
  const weekTotal = week.reduce((sum, day) => sum + day.earned, 0);
  const todayLog = days.find((day) => day.day === today);

  return (
    <AppScreen
      nav={false}
      back={{ label: "Översikt", onClick: onBack }}
      title={
        <span className="flex items-center gap-3">
          <Initial name={child.name} />
          <span className="truncate">{child.name}</span>
        </span>
      }
    >
      <section aria-labelledby="child-balance" className="space-y-4 rounded-3xl border border-primary/25 bg-card p-5">
        <div>
          <h2 id="child-balance" className="text-sm font-semibold text-muted-foreground">Skärmtid kvar</h2>
          <p className="mt-1 font-display text-5xl font-bold tabular-nums text-primary">
            {child.balance}
            <span className="ml-2 text-xl font-semibold text-muted-foreground">min</span>
          </p>
        </div>
        <UnlockStatus expiresAt={child.unlockExpiresAt} />
        <Button className="h-12 w-full text-base" onClick={onGive}>
          <CirclePlus className="h-5 w-5" aria-hidden="true" />
          Ge extra tid
        </Button>
      </section>

      <section aria-labelledby="child-today" className="space-y-3">
        <h2 id="child-today" className="font-display text-lg font-semibold">Idag</h2>
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="font-display text-2xl font-bold tabular-nums text-reward">+{child.earnedToday} min intjänat</p>
          <p className="text-sm text-muted-foreground">
            {child.stepsToday.toLocaleString("sv-SE")} steg i pass
            {todayLog ? ` · ${formatPassDistance(todayLog.distance)}` : ""}
          </p>
        </div>
      </section>

      <section aria-labelledby="child-week" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="child-week" className="font-display text-lg font-semibold">Senaste 7 dagarna</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-reward">+{weekTotal} min</span> totalt
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center rounded-3xl border border-border bg-card py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Laddar" />
          </div>
        ) : (
          <ol aria-label="Intjänade minuter per dag" className="grid grid-cols-7 items-end gap-1.5 rounded-3xl border border-border bg-card px-3 pb-3 pt-4">
            {week.map((day) => (
              <li key={day.key} className="flex h-32 flex-col items-center justify-end gap-1">
                <span className={cn("text-xs font-bold tabular-nums", day.earned > 0 ? "text-foreground" : "text-muted-foreground")}>
                  {day.earned}
                  <span className="sr-only"> min, {day.label}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn("w-full max-w-[30px] rounded-lg", day.earned > 0 ? "bg-reward" : "bg-border")}
                  style={{ height: day.earned > 0 ? Math.max(8, Math.round((day.earned / maxEarned) * 88)) : 4 }}
                />
                <span aria-hidden="true" className={cn("text-xs text-muted-foreground", day.key === today && "font-bold text-foreground")}>
                  {day.label}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="child-days" className="space-y-3">
        <h2 id="child-days" className="font-display text-lg font-semibold">Senaste dagarna</h2>
        {!loading && days.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Inga sparade pass de senaste 7 dagarna.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {days.map((day) => (
              <li key={day.day} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">
                    {day.day === today ? "Idag" : new Date(`${day.day}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {day.steps.toLocaleString("sv-SE")} steg · {formatPassDistance(day.distance)}
                  </p>
                </div>
                <p className="font-display font-bold tabular-nums text-reward">+{day.earned} min</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="child-rules" className="space-y-2.5">
        <h2 id="child-rules" className="ml-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Regler för {child.name}
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <li>
            <Button variant="ghost" disabled={goalLoading || Boolean(goalError)} onClick={() => setGoalOpen(true)} className="h-auto min-h-16 w-full justify-between rounded-none px-4 py-3 text-left">
              <span><span className="block font-semibold">Dagligt stegmål</span><span className="block text-sm text-muted-foreground">{goalLoading ? "Laddar…" : goalError ? "Kunde inte hämta stegmålet" : `${dailyStepGoal.toLocaleString("sv-SE")} steg`}</span></span>
              <span className="text-primary">Ändra</span>
            </Button>
          </li>
          <InfoRow icon={<Footprints className="h-5 w-5 text-reward" />} title="Skärmtid från steg" text="200 steg = 1 minut" />
          <InfoRow
            icon={<LockKeyhole className="h-5 w-5 text-primary" />}
            title="Spärrade appar"
            text={`Väljs tillsammans på ${genitive(child.name)} iPhone`}
          />
          <InfoRow
            icon={<Brain className="h-5 w-5" />}
            title="Uppgifter"
            text="Ämnen och nivå"
            badge="Snart"
          />
        </ul>
      </section>

      <ActivityGoalModal open={goalOpen} onOpenChange={setGoalOpen} currentGoal={dailyStepGoal} onSave={updateGoal} />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="h-12 w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
            Koppla bort {child.name}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Koppla bort {child.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {child.name} försvinner från din översikt. Ni kan koppla ihop kontona igen senare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove} className="bg-danger text-danger-foreground hover:bg-danger/90">
              Koppla bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppScreen>
  );
}

function InfoRow({ icon, title, text, badge }: { icon: ReactNode; title: string; text: string; badge?: string }) {
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-3">
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
      {badge && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{badge}</span>
      )}
    </li>
  );
}
