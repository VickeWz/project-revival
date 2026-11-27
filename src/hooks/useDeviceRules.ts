import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toNativeDowntimes, toNativeLimits, type LimitRow } from "@/lib/device-rules";
import { screenTimePlugin, type NativeLimitStatus, type ScreenTimeStatus } from "@/services/screenTime";

export interface LimitInfo {
  id: string;
  name: string;
  minutes: number;
  selectionCount: number;
  reached: boolean;
}

// Realtime pushes a parent's change at once; this poll is the fallback (and catches deletions).
const SYNC_INTERVAL_MS = 15_000;
let channelCount = 0;

/**
 * On the child's phone: keeps the parents' downtime schedules and app limits in the Screen Time
 * plugin, right after a parent changes them (realtime), when GameRun comes to the front, and every
 * 15 seconds. Rules are only sent when they differ from what the phone last received, because
 * restarting app limits resets today's usage.
 */
export function useDeviceRules(profileId: string | undefined, status: ScreenTimeStatus | null, setStatus: (status: ScreenTimeStatus) => void) {
  const [rows, setRows] = useState<LimitRow[]>([]);
  const [syncError, setSyncError] = useState("");
  const statusRef = useRef(status);
  statusRef.current = status;
  const ready = Boolean(profileId && status?.authorized && status.lockMode);

  useEffect(() => {
    if (!ready || !profileId) return;
    let cancelled = false;
    let running = false;
    let again = false;
    const sync = async (): Promise<void> => {
      if (document.visibilityState === "hidden") return;
      // A change that arrives during a sync is read right after it, never dropped.
      if (running) { again = true; return; }
      running = true;
      again = false;
      try {
        const [downtime, limits] = await Promise.all([
          supabase.from("downtime_schedules").select("start_time, end_time, days_enabled, is_enabled").eq("child_id", profileId),
          // "*" also reads app_packages (apps a parent picked) once the database has that column.
          supabase.from("app_limits").select("*").eq("child_id", profileId),
        ]);
        if (downtime.error) throw downtime.error;
        if (limits.error) throw limits.error;
        if (cancelled) return;
        setRows((limits.data ?? []) as LimitRow[]);

        const downtimeJson = JSON.stringify(toNativeDowntimes(downtime.data ?? []));
        if (downtimeJson !== (statusRef.current?.downtimeJson ?? "")) {
          const next = await screenTimePlugin.setDowntime({ json: downtimeJson });
          if (!cancelled) setStatus(next);
        }
        const limitsJson = JSON.stringify(toNativeLimits((limits.data ?? []) as LimitRow[]));
        if (limitsJson !== (statusRef.current?.limitsJson ?? "")) {
          const next = await screenTimePlugin.setLimits({ json: limitsJson });
          if (!cancelled) setStatus(next);
        }
        if (!cancelled) setSyncError("");
      } catch (error) {
        console.error("Kunde inte synka skärmfri tid och appgränser:", error);
        if (!cancelled) setSyncError("Skärmfri tid och appgränser kunde inte uppdateras på telefonen.");
      } finally {
        running = false;
        if (again && !cancelled) void sync();
      }
    };
    const onEvent = () => void sync();
    void sync();
    const timer = setInterval(onEvent, SYNC_INTERVAL_MS);
    window.addEventListener("focus", onEvent);
    document.addEventListener("visibilitychange", onEvent);
    // A parent turning downtime on or off, or changing a limit, reaches the phone at once.
    const channel = supabase
      .channel(`device-rules-${profileId}-${++channelCount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "downtime_schedules", filter: `child_id=eq.${profileId}` }, onEvent)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_limits", filter: `child_id=eq.${profileId}` }, onEvent)
      .subscribe();
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onEvent);
      document.removeEventListener("visibilitychange", onEvent);
      void supabase.removeChannel(channel);
    };
  }, [ready, profileId, setStatus]);

  const native = new Map<string, NativeLimitStatus>((status?.limits ?? []).map((limit): [string, NativeLimitStatus] => [limit.id, limit]));
  const limits: LimitInfo[] = rows
    .filter((row) => row.is_enabled)
    .map((row) => ({
      id: row.id,
      name: row.app_name,
      minutes: row.daily_limit_minutes,
      selectionCount: native.get(row.id)?.selectionCount ?? 0,
      reached: native.get(row.id)?.reached ?? false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  return { limits, syncError };
}
