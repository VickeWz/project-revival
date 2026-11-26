import { useEffect, useState } from "react";
import { Loader2, Moon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AppScreen } from "@/components/layout/AppScreen";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { DAY_KEYS, DAY_LABELS, MIN_DOWNTIME_MINUTES, clockToMinutes, downtimeLength, isValidDowntime } from "@/lib/device-rules";

const genitive = (name: string) => (/[sxz]$/i.test(name) ? name : `${name}s`);

/**
 * Skärmfri tid for one child (?childId=): a daily period when the child's iPhone is locked
 * except always-allowed apps, and earned time cannot be used. Enforced on the phone by
 * DeviceActivity and on the server by redeem_screen_time.
 */
export default function Downtime() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get("childId");
  const { profile } = useAuth();

  const [isEnabled, setIsEnabled] = useState(true);
  const [startTime, setStartTime] = useState("21:00");
  const [endTime, setEndTime] = useState("07:00");
  const [selectedDays, setSelectedDays] = useState<string[]>([...DAY_KEYS]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [childName, setChildName] = useState("");

  useEffect(() => {
    if (!profile?.id || !childId) return;
    let cancelled = false;
    void Promise.all([
      supabase.from("profiles").select("display_name").eq("id", childId).maybeSingle(),
      supabase.from("downtime_schedules").select("*").eq("parent_id", profile.id).eq("child_id", childId).maybeSingle(),
    ]).then(([{ data: child }, { data }]) => {
      if (cancelled) return;
      if (child) setChildName(child.display_name);
      if (data) {
        setIsEnabled(data.is_enabled);
        setStartTime(data.start_time.slice(0, 5));
        setEndTime(data.end_time.slice(0, 5));
        setSelectedDays(data.days_enabled);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [profile?.id, childId]);

  const start = clockToMinutes(startTime);
  const end = clockToMinutes(endTime);
  const valid = isValidDowntime(start, end, selectedDays);
  const back = () => navigate(childId ? `/parent?barn=${childId}` : "/parent");

  const toggleDay = (day: string) =>
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const handleSave = async () => {
    if (!profile?.id || !childId || saving) return;
    if (isEnabled && !valid) {
      toast.error(`Skärmfri tid måste vara minst ${MIN_DOWNTIME_MINUTES} minuter och gälla minst en dag.`);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("downtime_schedules").upsert(
      { parent_id: profile.id, child_id: childId, start_time: startTime, end_time: endTime, days_enabled: selectedDays, is_enabled: isEnabled },
      { onConflict: "parent_id,child_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("Kunde inte spara skärmfri tid");
      return;
    }
    toast.success("Skärmfri tid är sparad", { description: "Gäller när GameRun på telefonen har synkat." });
    back();
  };

  const phone = childName ? `${genitive(childName)} iPhone` : "barnets iPhone";

  return (
    <AppScreen nav={false} back={{ label: childName || "Tillbaka", onClick: back }} title="Skärmfri tid">
      <p className="-mt-4 text-muted-foreground">
        Under skärmfri tid är {phone} låst utom alltid tillåtna appar. Intjänad tid kan inte användas.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Laddar" />
        </div>
      ) : (
        <>
          <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Moon className="h-5 w-5 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span id="downtime-label" className="block font-semibold">Skärmfri tid</span>
              <span className="block text-sm text-muted-foreground">{isEnabled ? `${startTime}–${endTime}` : "Av"}</span>
            </span>
            <Switch aria-labelledby="downtime-label" checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {isEnabled && (
            <>
              <section aria-labelledby="downtime-times" className="space-y-2.5">
                <h2 id="downtime-times" className="ml-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Tider</h2>
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  <label className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                    <span className="font-semibold">Från</span>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11 rounded-xl bg-muted px-3 text-base tabular-nums text-foreground" />
                  </label>
                  <label className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                    <span className="font-semibold">Till</span>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11 rounded-xl bg-muted px-3 text-base tabular-nums text-foreground" />
                  </label>
                </div>
                {start !== null && end !== null && start !== end && (
                  <p className="ml-1 text-sm text-muted-foreground">
                    {Math.floor(downtimeLength(start, end) / 60)} h {downtimeLength(start, end) % 60} min{end < start ? ", slutar nästa morgon" : ""}
                  </p>
                )}
              </section>

              <section aria-labelledby="downtime-days" className="space-y-2.5">
                <h2 id="downtime-days" className="ml-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Dagar den börjar</h2>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAY_KEYS.map((day) => {
                    const on = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "h-11 rounded-xl text-sm font-semibold transition-colors",
                          on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
              </section>

              {!valid && (
                <p role="alert" className="text-sm text-destructive">
                  Skärmfri tid måste vara minst {MIN_DOWNTIME_MINUTES} minuter och gälla minst en dag.
                </p>
              )}
            </>
          )}

          <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
            Ändringen gäller när GameRun på {phone} har synkat, oftast när appen öppnas. Har ni två föräldrar gäller båda era scheman.
          </p>

          <Button className="h-14 w-full text-base" onClick={() => void handleSave()} disabled={saving || (isEnabled && !valid)}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Sparar…" : "Spara"}
          </Button>
        </>
      )}
    </AppScreen>
  );
}
