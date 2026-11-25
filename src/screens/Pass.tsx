// @ts-nocheck -- imported code written for a looser TypeScript config
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { STEPS_PER_MINUTE, formatPassDistance, stepsToNextMinute } from "@/lib/pass-metrics";
import { AlertTriangle, Brain, Footprints, PartyPopper, Play, Square } from "lucide-react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { healthKitService } from "@/services/healthKit";
import { watchPassData } from "@/services/passTracking";
import { supabase } from "@/integrations/supabase/client";
import { AppScreen } from "@/components/layout/AppScreen";
import { ActivitySummary } from "@/components/home/ActivitySummary";
import { format } from "date-fns";

/** The two ways to earn screen time. Hem links straight to either with ?del=. */
type EarnPart = "rorelse" | "uppgifter";

interface PassSession {
  id: string;
  startTime: Date;
}

interface ActivityLog {
  id: string;
  logged_at: string;
  steps: number;
  distance_meters: number;
  screen_time_earned: number;
  active_minutes: number;
}

interface PassResult {
  minutes: number;
  balance: number;
  steps: number;
  distance: number;
  seconds: number;
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
};

// Local calendar day, matching p_day when the pass is saved (not the UTC day).
const localDay = (date: Date) => format(date, "yyyy-MM-dd");

const formatLogDay = (day: string, today: string) => {
  if (day === today) return "Idag";
  return new Date(`${day}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
};

export default function Pass() {
  const [searchParams] = useSearchParams();
  const [part, setPart] = useState<EarnPart>(searchParams.get("del") === "uppgifter" ? "uppgifter" : "rorelse");
  const [view, setView] = useState<"home" | "active" | "done">("home");
  const [isActive, setIsActive] = useState(false);
  const [session, setSession] = useState<PassSession | null>(null);
  const [passData, setPassData] = useState({ steps: 0, distance: 0, activeMinutes: 0 });
  const [syncError, setSyncError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [passHistory, setPassHistory] = useState<ActivityLog[]>([]);
  const [result, setResult] = useState<PassResult | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endingRef = useRef(false);
  const endTimeRef = useRef<Date | null>(null);

  const { profile } = useAuth();
  const navigate = useNavigate();

  const earnedMinutes = healthKitService.calculateScreenTimeEarned(passData);

  const loadHistory = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setPassHistory(data);
  }, [profile]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Ask for HealthKit access up front so the start button can explain a missing permission.
  useEffect(() => {
    let cancelled = false;
    void healthKitService.requestAuthorization()
      .then((granted) => { if (!cancelled) setHasPermission(granted); })
      .catch(() => { if (!cancelled) setHasPermission(false); });
    return () => {
      cancelled = true;
    };
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (session) setElapsedSeconds(Math.floor((Date.now() - session.startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, session]);

  // Replace cumulative session samples; never add a polled total again.
  useEffect(() => {
    if (!isActive || !session || saving) return;
    return watchPassData(
      session,
      (data) => { if (!endingRef.current) { setPassData(data); setSyncError(false); } },
      () => setSyncError(true),
    );
  }, [isActive, session, saving]);

  // One tap starts the pass: no separate "ready" screen.
  const handleStart = useCallback(async () => {
    if (starting || session) return;
    setStarting(true);
    try {
      if (!hasPermission) {
        const granted = await healthKitService.requestAuthorization();
        setHasPermission(granted);
        if (!granted) {
          toast.error("Tillåt åtkomst till Hälsa för att starta.");
          return;
        }
      }

      setSession({
        id: crypto.randomUUID(),
        startTime: new Date(),
      });
      endTimeRef.current = null;
      setPassData({ steps: 0, distance: 0, activeMinutes: 0 });
      setSyncError(false);
      setElapsedSeconds(0);
      setIsActive(true);
      setView("active");
    } catch {
      toast.error("Kunde inte starta passet. Försök igen.");
    } finally {
      setStarting(false);
    }
  }, [hasPermission, starting, session]);

  const handleEnd = useCallback(async () => {
    if (!session || !profile || endingRef.current) return;
    endingRef.current = true;
    setSaving(true);
    endTimeRef.current ??= new Date();

    try {
      // Read once more at the fixed end time so the last received steps are included.
      const finalData = await healthKitService.getPassData(session.startTime, endTimeRef.current);
      setPassData(finalData);
      const { data: saved, error: saveError } = await supabase.rpc("complete_step_pass", {
        p_id: session.id,
        p_started_at: session.startTime.toISOString(),
        p_ended_at: endTimeRef.current.toISOString(),
        p_day: localDay(session.startTime),
        p_steps: finalData.steps,
        p_distance: finalData.distance,
        p_active_minutes: finalData.activeMinutes,
      });
      if (saveError) throw saveError;

      setResult({
        minutes: typeof saved.earned_minutes === "number" ? saved.earned_minutes : healthKitService.calculateScreenTimeEarned(finalData),
        balance: saved.balance,
        steps: finalData.steps,
        distance: finalData.distance,
        seconds: Math.floor((endTimeRef.current.getTime() - session.startTime.getTime()) / 1000),
      });
      setSession(null);
      setIsActive(false);
      setElapsedSeconds(0);
      setView("done");
      void loadHistory();
    } catch (error) {
      console.error("Error saving pass:", error);
      toast.error("Kunde inte spara passet. Försök igen.");
    } finally {
      endingRef.current = false;
      setSaving(false);
    }
  }, [session, profile, loadHistory]);

  // Active pass: focus mode without navigation, one big number that matters (+minutes).
  if (view === "active") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="header-safe px-5">
          <h1 className="mx-auto flex max-w-lg items-center justify-center gap-2 font-body text-sm font-semibold text-reward">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-reward opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-reward" />
            </span>
            {saving ? "Sparar passet…" : "Pass pågår"}
          </h1>
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-6">
          <p className="text-center font-display text-6xl font-bold tabular-nums text-foreground" aria-label="Tid">
            {formatTime(elapsedSeconds)}
          </p>

          <section className="mt-8 rounded-3xl border border-reward/30 bg-reward/10 p-6 text-center">
            <p className="text-sm font-semibold text-muted-foreground">Intjänat hittills</p>
            <p className="mt-1 font-display text-6xl font-bold tabular-nums text-reward">
              +<span aria-label="Intjänade minuter">{earnedMinutes}</span>
              <span className="ml-2 text-2xl">min</span>
            </p>
            <div
              className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Mot nästa minut"
              aria-valuemin={0}
              aria-valuemax={STEPS_PER_MINUTE}
              aria-valuenow={passData.steps % STEPS_PER_MINUTE}
            >
              <motion.div
                className="h-full rounded-full bg-reward"
                animate={{ width: `${((passData.steps % STEPS_PER_MINUTE) / STEPS_PER_MINUTE) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Nästa minut om {stepsToNextMinute(passData.steps)} steg</p>
          </section>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <dt className="text-xs font-semibold text-muted-foreground">Steg</dt>
              <dd aria-label="Steg under passet" className="mt-1 font-display text-2xl font-bold tabular-nums">
                {passData.steps.toLocaleString("sv-SE")}
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <dt className="text-xs font-semibold text-muted-foreground">Distans</dt>
              <dd aria-label="Distans under passet" className="mt-1 font-display text-2xl font-bold tabular-nums">
                {formatPassDistance(passData.distance)}
              </dd>
            </div>
          </dl>

          {syncError && <p role="status" className="mt-4 text-center text-sm text-destructive">Kunde inte synka med Hälsa. Försöker igen…</p>}

          <div className="mt-auto pt-8 bottom-bar-safe">
            <Button
              onClick={handleEnd}
              disabled={saving}
              variant="destructive"
              className="h-14 w-full font-display text-base font-bold"
            >
              <Square className="h-5 w-5" />
              {saving ? "Sparar…" : "Avsluta pass"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Steg från Hälsa kan komma med lite fördröjning.</p>
          </div>
        </main>
      </div>
    );
  }

  // Pass result: the reward moment gets its own screen instead of a toast.
  if (view === "done" && result) {
    const earnedAny = result.minutes > 0;
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="header-safe mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-5 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mt-14 flex h-24 w-24 items-center justify-center rounded-full bg-reward text-reward-foreground shadow-[0_0_60px_-10px_var(--reward)]"
          >
            <PartyPopper className="h-11 w-11" aria-hidden="true" />
          </motion.div>
          <h1 className="mt-6 font-display text-3xl font-bold">{earnedAny ? "Bra jobbat!" : "Passet är sparat"}</h1>
          <p className="mt-2 font-display text-6xl font-bold tabular-nums text-reward">+{result.minutes} min</p>
          <p className="mt-3 text-muted-foreground">
            {result.steps.toLocaleString("sv-SE")} steg · {formatPassDistance(result.distance)} · {formatTime(result.seconds)}
          </p>
          {!earnedAny && <p className="mt-1 text-sm text-muted-foreground">Gå {STEPS_PER_MINUTE} steg för att tjäna en minut.</p>}

          <div className="mt-8 w-full rounded-3xl border border-primary/25 bg-card p-5">
            <p className="text-sm font-semibold text-muted-foreground">Din skärmtid</p>
            <p className="font-display text-4xl font-bold tabular-nums text-primary">{result.balance} min</p>
          </div>

          <div className="mt-auto w-full space-y-2 pt-8 bottom-bar-safe">
            <Button className="h-14 w-full text-base" onClick={() => navigate("/child")}>
              Till min skärmtid
            </Button>
            <Button variant="ghost" className="h-12 w-full" onClick={() => { setResult(null); setView("home"); }}>
              Klar
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Tjäna: choose how to earn — Rörelse (physical) or Uppgifter (cognitive).
  const today = localDay(new Date());
  const earnedToday = passHistory
    .filter((log) => log.logged_at === today)
    .reduce((sum, log) => sum + log.screen_time_earned, 0);

  return (
    <AppScreen title="Tjäna tid">
      <Tabs value={part} onValueChange={(value) => setPart(value as EarnPart)}>
        <TabsList aria-label="Välj hur du vill tjäna tid" className="grid h-auto w-full grid-cols-2 rounded-2xl bg-muted p-1">
          <TabsTrigger value="rorelse" className="h-11 gap-2 rounded-xl text-sm font-semibold data-[state=active]:bg-card">
            <Footprints className="h-4 w-4" aria-hidden="true" />
            Rörelse
          </TabsTrigger>
          <TabsTrigger value="uppgifter" className="h-11 gap-2 rounded-xl text-sm font-semibold data-[state=active]:bg-card">
            <Brain className="h-4 w-4" aria-hidden="true" />
            Uppgifter
            <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">Snart</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rorelse" className="mt-6 space-y-7">
          {hasPermission === false && (
            <p role="status" className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              Pass kräver iPhone-appen och att GameRun får läsa steg i Hälsa.
            </p>
          )}

          <section className="rounded-3xl border border-reward/30 bg-reward/10 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-reward text-reward-foreground">
                <Footprints className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Gå eller spring</h2>
                <p className="text-sm text-muted-foreground">Varje {STEPS_PER_MINUTE} steg ger 1 minut skärmtid.</p>
              </div>
            </div>
            <Button variant="reward" onClick={handleStart} disabled={starting} className="mt-5 h-14 w-full font-display text-base font-bold">
              <Play className="h-5 w-5" />
              {starting ? "Startar…" : "Starta pass"}
            </Button>
          </section>

          <section aria-labelledby="history-heading" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="history-heading" className="font-display text-lg font-semibold">Senaste dagarna</h2>
              <p className="text-sm text-muted-foreground">
                Idag <span className="font-semibold text-reward">+{earnedToday} min</span>
              </p>
            </div>
            {passHistory.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Inga pass ännu. Starta ditt första!
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {passHistory.slice(0, 5).map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{formatLogDay(log.logged_at, today)}</p>
                      <p className="text-xs text-muted-foreground">
                        {(log.steps ?? 0).toLocaleString("sv-SE")} steg · {formatPassDistance(log.distance_meters)}
                      </p>
                    </div>
                    <p className="font-display font-bold tabular-nums text-reward">+{log.screen_time_earned} min</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ActivitySummary onSync={() => {}} />
        </TabsContent>

        <TabsContent value="uppgifter" className="mt-6">
          <section className="rounded-3xl border border-border bg-card p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground">
              <Brain className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold">Uppgifter kommer snart</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Här kommer du att kunna tjäna skärmtid genom att lösa uppgifter, till exempel i matte, svenska och engelska.
              Din förälder väljer ämnen och nivå.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </AppScreen>
  );
}
