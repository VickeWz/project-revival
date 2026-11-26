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

const SYNC_INTERVAL_MS = 60_000;

/**
 * On the child's iPhone: keeps the parents' downtime schedules and app limits in the Screen Time
 * plugin. Rules are only sent when they differ from what the phone last received, because
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
    const sync = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const [downtime, limits] = await Promise.all([
          supabase.from("downtime_schedules").select("start_time, end_time, days_enabled, is_enabled").eq("child_id", profileId),
          supabase.from("app_limits").select("id, app_name, daily_limit_minutes, is_enabled").eq("child_id", profileId),
        ]);
        if (downtime.error) throw downtime.error;
        if (limits.error) throw limits.error;
        if (cancelled) return;
        setRows(limits.data ?? []);

        const downtimeJson = JSON.stringify(toNativeDowntimes(downtime.data ?? []));
        if (downtimeJson !== (statusRef.current?.downtimeJson ?? "")) {
          const next = await screenTimePlugin.setDowntime({ json: downtimeJson });
          if (!cancelled) setStatus(next);
        }
        const limitsJson = JSON.stringify(toNativeLimits(limits.data ?? []));
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
      }
    };
    void sync();
    const timer = setInterval(() => void sync(), SYNC_INTERVAL_MS);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
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
