import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { describeDowntime, type DowntimeRow } from "@/lib/device-rules";
import { useActivityGoal } from "@/hooks/useActivityGoal";
import { ActivityGoalModal } from "@/components/settings/ActivityGoalModal";
import { format, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import { Brain, ChevronRight, CirclePlus, Footprints, Loader2, LockKeyhole, Moon, Timer } from "lucide-react";
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
import { DeviceChangeCode } from "@/components/parent/DeviceChangeCode";
import { DailyScreenTimeCard } from "@/components/parent/DailyScreenTimeCard";
import { formatPassDistance } from "@/lib/pass-metrics";
import { MINUTES_PER_CORRECT, TASK_DAILY_LIMIT } from "@/lib/tasks/rewards";
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
  const [codeOpen, setCodeOpen] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  // This parent's own downtime schedule and limits for the child (RLS shows only their own rows).
  const [rules, setRules] = useState<{ downtime: DowntimeRow | null; limits: number }>({ downtime: null, limits: 0 });
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    void Promise.all([
      supabase.from("downtime_schedules").select("start_time, end_time, days_enabled, is_enabled")
        .eq("parent_id", profile.id).eq("child_id", child.id).maybeSingle(),
      supabase.from("app_limits").select("id", { count: "exact", head: true })
        .eq("parent_id", profile.id).eq("child_id", child.id).eq("is_enabled", true),
    ]).then(([downtime, limits]) => {
      if (!cancelled) setRules({ downtime: downtime.data ?? null, limits: limits.count ?? 0 });
    });
    return () => { cancelled = true; };
  }, [profile?.id, child.id, refreshKey]);
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

      <DailyScreenTimeCard childId={child.id} childName={child.name} />

      <section aria-labelledby="child-today" className="space-y-3">
        <h2 id="child-today" className="font-display text-lg font-semibold">Idag</h2>
        <p className="font-display text-2xl font-bold tabular-nums">
          {child.dailySteps === null ? "Dagens steg har inte delats ännu" : `${child.dailySteps.toLocaleString("sv-SE")} steg totalt idag`}
        </p>
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="font-display text-2xl font-bold tabular-nums text-reward">+{child.earnedToday} min intjänat</p>
          <p className="text-sm text-muted-foreground">
            Rörelse +{child.movementMinutesToday} min · Uppgifter +{child.taskMinutesToday} min
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
            Ingen intjänad tid de senaste 7 dagarna.
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
          <InfoRow icon={<Footprints className="h-5 w-5 text-reward" />} title="Skärmtid från steg" text="200 steg = 1 minut. Alla dagens steg räknas." />
          <li>
            <Button variant="ghost" onClick={() => setCodeOpen(true)} className="h-auto min-h-16 w-full justify-start gap-3 rounded-none px-4 py-3 text-left">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <LockKeyhole className="h-5 w-5 text-primary" />
              </span>
              <span className="min-w-0 flex-1 whitespace-normal">
                <span className="block font-semibold">Låsta och tillåtna appar</span>
                <span className="block text-sm font-normal text-muted-foreground">
                  Ändras på {genitive(child.name)} iPhone med en kod från dig
                </span>
              </span>
              <span className="shrink-0 text-primary">Visa kod</span>
            </Button>
          </li>
          <RuleLink
            icon={<Moon className="h-5 w-5 text-primary" />}
            title="Skärmfri tid"
            text={describeDowntime(rules.downtime)}
            onClick={() => navigate(`/parent/downtime?childId=${child.id}`)}
          />
          <RuleLink
            icon={<Timer className="h-5 w-5 text-primary" />}
            title="Appgränser"
            text={rules.limits === 0 ? "Inga gränser" : `${rules.limits} ${rules.limits === 1 ? "gräns" : "gränser"}`}
            onClick={() => navigate(`/parent/app-limits?childId=${child.id}`)}
          />
          <InfoRow
            icon={<Brain className="h-5 w-5" />}
            title="Uppgifter i matte, svenska och engelska"
            text={`${MINUTES_PER_CORRECT} minut per rätt svar, högst ${TASK_DAILY_LIMIT} min per dag`}
          />
        </ul>
      </section>

      <ActivityGoalModal open={goalOpen} onOpenChange={setGoalOpen} currentGoal={dailyStepGoal} onSave={updateGoal} />
      <DeviceChangeCode childId={child.id} phone={`${genitive(child.name)} iPhone`} open={codeOpen} onOpenChange={setCodeOpen} />
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

function RuleLink({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-muted-foreground">{text}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
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
