import { useEffect, useState } from "react";
import { Loader2, Sunrise } from "lucide-react";
import { toast } from "sonner";
import {
  DAILY_LEVELS,
  formatDailyLevel,
  loadDailyScreenTime,
  missingInDatabase,
  setDailyScreenTime,
  type DailyLevel,
} from "@/lib/daily-screen-time";
import { cn } from "@/lib/utils";

const NOT_READY = "Grundtid är inte aktiverad i databasen än.";

/**
 * On the parent's child screen: how much base screen time the child gets at the start of every day.
 * One tap saves it; the database adds it to the child's balance once per day.
 */
export function DailyScreenTimeCard({ childId, childName }: { childId: string; childName: string }) {
  const [level, setLevel] = useState<DailyLevel | null>(null);
  const [saving, setSaving] = useState<DailyLevel | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLevel(null);
    setError("");
    loadDailyScreenTime(childId)
      .then((minutes) => { if (!cancelled) setLevel(minutes); })
      .catch((e) => { if (!cancelled) setError(missingInDatabase(e) ? NOT_READY : "Kunde inte hämta grundtiden."); });
    return () => { cancelled = true; };
  }, [childId]);

  const choose = async (minutes: DailyLevel) => {
    if (saving !== null || minutes === level) return;
    const previous = level;
    setSaving(minutes);
    setLevel(minutes);
    setError("");
    try {
      const saved = await setDailyScreenTime(childId, minutes);
      const today = saved.todayChange > 0 ? ` I dag: +${saved.todayChange} min.` : saved.todayChange < 0 ? ` I dag: −${-saved.todayChange} min.` : "";
      toast.success(minutes === 0 ? `${childName} får ingen grundtid` : `${childName} får ${formatDailyLevel(minutes)} varje dag`, {
        description: `Gäller från nu.${today}`,
      });
    } catch (e) {
      setLevel(previous);
      setError(missingInDatabase(e) ? NOT_READY : "Kunde inte spara. Försök igen.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section aria-labelledby="daily-base-heading" className="space-y-4 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Sunrise className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <h2 id="daily-base-heading" className="font-display text-lg font-semibold leading-tight">Grundtid varje dag</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Skärmtid som {childName} får när dagen börjar. Det som inte används försvinner vid midnatt.
          </p>
        </div>
      </div>

      <div role="radiogroup" aria-labelledby="daily-base-heading" className="grid grid-cols-4 gap-2">
        {DAILY_LEVELS.map((minutes) => {
          const selected = level === minutes;
          return (
            <button
              key={minutes}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={formatDailyLevel(minutes)}
              disabled={level === null || saving !== null}
              onClick={() => void choose(minutes)}
              className={cn(
                "flex h-[4.5rem] flex-col items-center justify-center rounded-2xl transition duration-200 active:scale-[0.97] disabled:cursor-default",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                level === null && "opacity-50",
              )}
            >
              {saving === minutes ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <span className="font-display text-2xl font-bold leading-none tabular-nums">{minutes / 60} h</span>
              )}
              <span className={cn("mt-1 text-[11px] font-semibold", selected ? "opacity-80" : "text-muted-foreground")}>
                {minutes === 0 ? "Ingen" : `${minutes} min`}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tid från steg och uppgifter, och extra tid från dig, sparas som vanligt. Med 0 h kan {childName} fortfarande tjäna och be om tid.
        </p>
      )}
    </section>
  );
}
