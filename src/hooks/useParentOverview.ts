import { useCallback, useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { claimDailyScreenTimeOnce } from "@/lib/daily-screen-time";
import { untypedFrom } from "@/lib/untyped-db";

export interface LinkedChild {
  id: string;
  name: string;
  balance: number;
  /** Steps saved with today's earned minutes (passes and daily steps). */
  stepsToday: number;
  dailySteps: number | null;
  /** All minutes earned today: movement plus tasks. */
  earnedToday: number;
  movementMinutesToday: number;
  taskMinutesToday: number;
  unlockExpiresAt: string | null;
}

export interface TimeRequest {
  id: string;
  childId: string;
  childName: string;
  requestedMinutes: number;
  createdAt: string;
}

export interface DayLog {
  day: string;
  steps: number;
  distance: number;
  /** Movement plus tasks. */
  earned: number;
}

type TaskRow = { profile_id: string; day: string; earned_minutes: number };

/** Minutes from tasks per child and day; empty if they cannot be read. */
async function loadTaskMinutes(childIds: string[], fromDay: string): Promise<TaskRow[]> {
  const { data, error } = await untypedFrom("task_rounds")
    .select("profile_id, day, earned_minutes")
    .in("profile_id", childIds)
    .gte("day", fromDay);
  if (error) {
    console.error("Kunde inte läsa uppgifter:", error);
    return [];
  }
  return (data ?? []) as TaskRow[];
}

const sumTasks = (rows: TaskRow[], childId: string, day: string) =>
  rows.filter((row) => row.profile_id === childId && row.day === day).reduce((sum, row) => sum + row.earned_minutes, 0);

// Local calendar day, matching how passes are saved (p_day), not the UTC day.
export const localDay = (date: Date) => format(date, "yyyy-MM-dd");

/** Linked children with balances and today's saved activity, plus pending time requests. Polls every 3 s. */
export function useParentOverview() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [requests, setRequests] = useState<TimeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChildren = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data: links, error: linksError } = await supabase
        .from("parent_child_links")
        .select("child_id")
        .eq("parent_id", profile.id);
      if (linksError) throw linksError;
      const childIds = (links ?? []).map((link) => link.child_id);
      if (childIds.length === 0) {
        setChildren([]);
        return;
      }
      // Give today's base time first (once per day), so the parent sees the same balance as the child.
      await Promise.all(childIds.map((childId) => claimDailyScreenTimeOnce(childId)));
      const [{ data: profiles, error: profilesError }, { data: balances }, { data: today }, { data: unlocks, error: unlockError }, { data: dailyTotals, error: dailyError }, taskRows] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", childIds),
        supabase.from("screen_time_balance").select("user_id, minutes_remaining").in("user_id", childIds),
        supabase
          .from("activity_logs")
          .select("user_id, steps, screen_time_earned")
          .in("user_id", childIds)
          .eq("logged_at", localDay(new Date())),
        supabase.from("screen_time_sessions")
          .select("profile_id, expires_at")
          .in("profile_id", childIds)
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false }),
        supabase.from("current_daily_steps").select("child_id, steps").in("child_id", childIds).eq("day", localDay(new Date())),
        loadTaskMinutes(childIds, localDay(new Date())),
      ]);
      if (profilesError) throw profilesError;
      if (unlockError) console.error("Kunde inte läsa aktiva upplåsningar:", unlockError);
      if (dailyError) console.error("Kunde inte läsa dagens steg:", dailyError);
      setChildren(
        (profiles ?? [])
          .map((child) => {
            const log = today?.find((row) => row.user_id === child.id);
            const movement = log?.screen_time_earned ?? 0;
            const tasks = sumTasks(taskRows, child.id, localDay(new Date()));
            return {
              id: child.id,
              name: child.display_name,
              balance: balances?.find((row) => row.user_id === child.id)?.minutes_remaining ?? 0,
              stepsToday: log?.steps ?? 0,
              dailySteps: dailyTotals?.find((row) => row.child_id === child.id)?.steps ?? null,
              earnedToday: movement + tasks,
              movementMinutesToday: movement,
              taskMinutesToday: tasks,
              unlockExpiresAt: unlocks?.find((session) => session.profile_id === child.id)?.expires_at ?? null,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name, "sv")),
      );
    } catch (error) {
      console.error("Error fetching linked children:", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const fetchRequests = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from("screen_time_requests")
        .select("id, child_id, requested_minutes, created_at")
        .eq("parent_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) {
        setRequests([]);
        return;
      }
      const { data: names } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", data.map((row) => row.child_id));
      setRequests(
        data.map((row) => ({
          id: row.id,
          childId: row.child_id,
          childName: names?.find((p) => p.id === row.child_id)?.display_name ?? "Barnet",
          requestedMinutes: row.requested_minutes,
          createdAt: row.created_at,
        })),
      );
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  }, [profile?.id]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchChildren(), fetchRequests()]);
  }, [fetchChildren, fetchRequests]);

  useEffect(() => {
    if (!profile?.id) return;
    let pending = false;
    const tick = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try { await refresh(); } finally { pending = false; }
    };
    void tick();
    const interval = setInterval(() => void tick(), 3000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, [profile?.id, refresh]);

  return { children, setChildren, requests, setRequests, loading, refresh };
}

/** The last seven days of saved activity for one child (one row per day). */
export function useChildWeek(childId: string | null, refreshKey: number) {
  const [days, setDays] = useState<DayLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    setLoading(true);
    const fromDay = localDay(subDays(new Date(), 6));
    void Promise.all([
      supabase
        .from("activity_logs")
        .select("logged_at, steps, distance_meters, screen_time_earned")
        .eq("user_id", childId)
        .gte("logged_at", fromDay)
        .order("logged_at", { ascending: false }),
      loadTaskMinutes([childId], fromDay),
    ]).then(([{ data, error }, taskRows]) => {
      if (cancelled) return;
      if (error) console.error("Error fetching child activity:", error);
      const byDay = new Map<string, DayLog>(
        (data ?? []).map((row) => [row.logged_at, {
          day: row.logged_at,
          steps: row.steps ?? 0,
          distance: row.distance_meters ?? 0,
          earned: row.screen_time_earned ?? 0,
        }]),
      );
      for (const row of taskRows) {
        const day = byDay.get(row.day) ?? { day: row.day, steps: 0, distance: 0, earned: 0 };
        byDay.set(row.day, { ...day, earned: day.earned + row.earned_minutes });
      }
      setDays([...byDay.values()].sort((a, b) => b.day.localeCompare(a.day)));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [childId, refreshKey]);

  return { days, loading };
}
