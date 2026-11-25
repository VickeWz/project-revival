import { useCallback, useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface LinkedChild {
  id: string;
  name: string;
  balance: number;
  /** Steps saved from today's passes. Parents cannot read a child's full HealthKit day. */
  stepsToday: number;
  earnedToday: number;
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
  earned: number;
}

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
      const [{ data: profiles, error: profilesError }, { data: balances }, { data: today }, { data: unlocks, error: unlockError }] = await Promise.all([
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
      ]);
      if (profilesError) throw profilesError;
      if (unlockError) console.error("Kunde inte läsa aktiva upplåsningar:", unlockError);
      setChildren(
        (profiles ?? [])
          .map((child) => {
            const log = today?.find((row) => row.user_id === child.id);
            return {
              id: child.id,
              name: child.display_name,
              balance: balances?.find((row) => row.user_id === child.id)?.minutes_remaining ?? 0,
              stepsToday: log?.steps ?? 0,
              earnedToday: log?.screen_time_earned ?? 0,
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
    void supabase
      .from("activity_logs")
      .select("logged_at, steps, distance_meters, screen_time_earned")
      .eq("user_id", childId)
      .gte("logged_at", localDay(subDays(new Date(), 6)))
      .order("logged_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Error fetching child activity:", error);
        setDays(
          (data ?? []).map((row) => ({
            day: row.logged_at,
            steps: row.steps ?? 0,
            distance: row.distance_meters ?? 0,
            earned: row.screen_time_earned ?? 0,
          })),
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [childId, refreshKey]);

  return { days, loading };
}
