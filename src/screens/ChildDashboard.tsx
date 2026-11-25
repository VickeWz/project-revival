import { useEffect, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { ActivityRing } from "@/components/ActivityRing";
import { AppScreen } from "@/components/layout/AppScreen";
import { ScreenTimeControl } from "@/components/ScreenTimeControl";
import { Brain, ChevronRight, Footprints, RefreshCw } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { useAuth } from "@/hooks/useAuth";
import { useActivityGoal } from "@/hooks/useActivityGoal";
import { healthKitService, type HealthData } from "@/services/healthKit";
import { STEPS_PER_MINUTE, formatPassDistance } from "@/lib/pass-metrics";
import { createDailyStepSync } from "@/lib/daily-steps";
import { claimYesterdayOnce, createStepRewardSync, type StepClaim } from "@/lib/step-rewards";
import { MINUTES_PER_CORRECT } from "@/lib/tasks/rewards";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

/**
 * Hem, top to bottom: today's steps and the minutes they have earned, "how much time do I have?"
 * (balance card, unlock, ask a parent) and "how do I get more?" (the two ways to earn).
 */
export default function ChildDashboard() {
  const { profile } = useAuth();
  const { dailyStepGoal } = useActivityGoal();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [earnedToday, setEarnedToday] = useState<number | null>(null);
  const [status, setStatus] = useState(healthKitService.isAvailable() ? "Hämtar från Hälsa…" : "Steg visas i iPhone-appen.");
  const [retry, setRetry] = useState(0);
  const isChild = profile?.role === "child";

  // Minutes already earned from movement today (passes and daily steps), before the next claim.
  useEffect(() => {
    if (!profile?.id || !isChild) return;
    let cancelled = false;
    void supabase
      .from("movement_day_credits")
      .select("credited_minutes")
      .eq("profile_id", profile.id)
      .eq("day", format(new Date(), "yyyy-MM-dd"))
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setEarnedToday((current) => current ?? data?.credited_minutes ?? 0); });
    return () => { cancelled = true; };
  }, [profile?.id, isChild]);

  useEffect(() => {
    if (!healthKitService.isAvailable()) return;
    let cancelled = false;
    let stop = () => {};
    const share = isChild && profile ? createDailyStepSync(profile.id) : null;
    const reward = isChild ? createStepRewardSync() : null;
    let readingDay = format(new Date(), "yyyy-MM-dd");

    const credited = (claim: StepClaim | null, day: string) => {
      if (cancelled || !claim) return;
      if (day === format(new Date(), "yyyy-MM-dd")) setEarnedToday(claim.dayMinutes);
      if (claim.earnedMinutes > 0) toast.success(`+${claim.earnedMinutes} min skärmtid från dina steg`);
    };

    setStatus("Hämtar från Hälsa…");
    void healthKitService.requestAuthorization().then((granted) => {
      if (cancelled) return;
      if (!granted) { setStatus("Tillåt åtkomst till Hälsa i iPhones inställningar."); return; }
      if (isChild && profile) {
        void claimYesterdayOnce(profile.id, (start, end) => healthKitService.getStepsBetween(start, end))
          .then((claim) => { if (claim?.earnedMinutes && !cancelled) toast.success(`+${claim.earnedMinutes} min från gårdagens steg`); })
          .catch((error) => console.warn("Kunde inte spara gårdagens steg:", error));
      }
      stop = healthKitService.watchData(
        () => {
          readingDay = format(new Date(), "yyyy-MM-dd");
          return healthKitService.getTodayData();
        },
        (data) => {
          if (cancelled) return;
          const day = readingDay;
          setHealthData(data);
          setStatus("Synkat med Hälsa");
          if (share) void share(data.steps, day).catch(() => {
            if (!cancelled) setStatus("Stegen visas här, men kunde inte delas. Försöker igen…");
          });
          if (reward) void reward(data.steps, day).then((claim) => credited(claim, day)).catch((error) => {
            console.warn("Kunde inte spara stegen som skärmtid:", error);
            if (!cancelled) setStatus("Stegen visas här, men skärmtiden kunde inte sparas. Försöker igen…");
          });
        },
        () => setStatus("Kunde inte synka med Hälsa. Försöker igen…"),
        1000,
      );
    }).catch(() => { if (!cancelled) setStatus("Kunde inte hämta från Hälsa."); });
    return () => { cancelled = true; stop(); };
  }, [retry, profile?.id, isChild]);

  const progress = healthData ? Math.min(100, healthData.steps / dailyStepGoal * 100) : 0;

  return (
    <AppScreen title={`Hej${profile?.display_name ? ` ${profile.display_name}` : ""}! 👋`}>
      <section aria-labelledby="today-heading" className="space-y-3">
        <h2 id="today-heading" className="font-display text-lg font-semibold">Idag</h2>
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4">
          <ActivityRing progress={progress} size={84} strokeWidth={9}>
            <span className="text-sm font-bold tabular-nums">{Math.round(progress)}%</span>
          </ActivityRing>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold tabular-nums" aria-label="Dagens steg">
              {healthData ? healthData.steps.toLocaleString("sv-SE") : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              av {dailyStepGoal.toLocaleString("sv-SE")} steg{healthData ? ` · ${formatPassDistance(healthData.distance)}` : ""}
            </p>
            {isChild && earnedToday !== null && (
              <p className="mt-0.5 text-sm font-semibold text-reward" aria-label="Intjänat från rörelse idag">
                +{earnedToday} min skärmtid idag
              </p>
            )}
            <p role="status" className="mt-1 text-xs text-muted-foreground">{status}</p>
          </div>
          {healthKitService.isAvailable() && (
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Synka igen" onClick={() => setRetry((v) => v + 1)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </section>

      <ScreenTimeControl />

      <section aria-labelledby="earn-heading" className="space-y-3">
        <h2 id="earn-heading" className="font-display text-lg font-semibold">Tjäna mer tid</h2>
        <div className="grid grid-cols-2 gap-3">
          <EarnTile to="/pass?del=rorelse" icon={Footprints} title="Rörelse" text={`${STEPS_PER_MINUTE} steg = 1 min`} />
          <EarnTile to="/pass?del=uppgifter" icon={Brain} title="Uppgifter" text={`Rätt svar = ${MINUTES_PER_CORRECT} min`} />
        </div>
      </section>
    </AppScreen>
  );
}

function EarnTile({ to, icon: Icon, title, text }: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-[132px] flex-col justify-between rounded-3xl border border-reward/30 bg-reward/10 p-4 transition-colors active:scale-[0.98]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-reward text-reward-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="flex items-center justify-between font-display text-lg font-bold text-foreground">
          {title}
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </span>
    </Link>
  );
}
