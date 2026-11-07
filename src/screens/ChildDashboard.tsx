import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActivityRing } from "@/components/ActivityRing";
import { BottomNav } from "@/components/BottomNav";
import { ActivitySummary } from "@/components/home/ActivitySummary";
import { ScreenTimeControl } from "@/components/ScreenTimeControl";
import { Settings, Play, Target, RefreshCw } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/hooks/useAuth";
import { useActivityGoal } from "@/hooks/useActivityGoal";
import { healthKitService, type HealthData } from "@/services/healthKit";
import { earnedScreenMinutes, formatPassDistance } from "@/lib/pass-metrics";
import logo from "@/assets/logo.png";

export default function ChildDashboard() {
  const { profile } = useAuth();
  const { dailyStepGoal } = useActivityGoal();
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [status, setStatus] = useState(healthKitService.isAvailable() ? "Hämtar från Hälsa…" : "Hälsa är endast tillgängligt på iPhone.");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!healthKitService.isAvailable()) return;
    let cancelled = false;
    let stop = () => {};
    setStatus("Hämtar från Hälsa…");
    void healthKitService.requestAuthorization().then((granted) => {
      if (cancelled) return;
      if (!granted) { setStatus("Tillåt åtkomst till Hälsa i iPhones inställningar."); return; }
      stop = healthKitService.watchData(
        () => healthKitService.getTodayData(),
        (data) => { setHealthData(data); setStatus("Synkat med Hälsa"); },
        () => setStatus("Kunde inte synka med Hälsa. Försöker igen…"),
        1000,
      );
    }).catch(() => { if (!cancelled) setStatus("Kunde inte hämta från Hälsa."); });
    return () => { cancelled = true; stop(); };
  }, [retry]);

  const progress = healthData ? Math.min(100, healthData.steps / dailyStepGoal * 100) : 0;
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <img src={logo} alt="GameRun" className="w-10 h-10" />
        <Button variant="ghost" size="icon" aria-label="Inställningar" onClick={() => navigate("/settings")}><Settings className="w-5 h-5" /></Button>
      </header>
      <main className="px-6 max-w-lg mx-auto space-y-6">
        <h1 className="font-display font-bold text-2xl">Hej{profile?.display_name ? ` ${profile.display_name}` : ""}! 👋</h1>
        <section className="space-y-5">
          <div className="flex justify-between items-center gap-3">
            <h2 className="font-display font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Dagens stegmål</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>Ändra mål</Button>
          </div>
          <div className="flex justify-center">
            <ActivityRing progress={progress} size={180} strokeWidth={14}>
              <div className="text-center">
                <p className="font-display font-bold text-3xl text-primary tabular-nums" aria-label="Dagens steg">{healthData ? healthData.steps.toLocaleString("sv-SE") : "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">av {dailyStepGoal.toLocaleString("sv-SE")} steg</p>
              </div>
            </ActivityRing>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-center">
            <div><dt className="text-sm text-muted-foreground">Dagens distans</dt><dd className="font-bold text-xl text-primary tabular-nums">{healthData ? formatPassDistance(healthData.distance) : "—"}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Stegens skärmtid</dt><dd className="font-bold text-xl text-primary tabular-nums">{healthData ? `${earnedScreenMinutes(healthData.steps)} min` : "—"}</dd></div>
          </dl>
          <div className="flex items-center justify-between gap-3">
            <p role="status" className="text-sm text-muted-foreground">{status}</p>
            {healthKitService.isAvailable() && <Button variant="ghost" size="icon" aria-label="Synka igen" onClick={() => setRetry(v => v + 1)}><RefreshCw className="w-4 h-4" /></Button>}
          </div>
        </section>
        <Button className="w-full h-12" onClick={() => navigate("/pass")}><Play className="w-4 h-4 mr-2" />Starta ett pass</Button>
        <ScreenTimeControl />
        <ActivitySummary onSync={(data) => { setHealthData(data); setStatus("Synkat med Hälsa"); }} />
      </main>
      <BottomNav />
    </div>
  );
}
