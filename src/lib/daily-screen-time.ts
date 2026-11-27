import { z } from "zod";
import { untypedFrom, untypedRpc } from "@/lib/untyped-db";

/**
 * Daily base screen time ("grundtid"): a parent chooses 0, 1, 2 or 3 hours per child. The database
 * (claim_daily_screen_time) adds it to the child's ordinary balance once per Swedish day, whichever
 * app opens first, and removes what was left unused of the previous day's base time. Earned minutes
 * and time a parent gives stay as before.
 */
export const DAILY_LEVELS = [0, 60, 120, 180] as const;
export type DailyLevel = (typeof DAILY_LEVELS)[number];

export const isDailyLevel = (minutes: unknown): minutes is DailyLevel =>
  typeof minutes === "number" && (DAILY_LEVELS as readonly number[]).includes(minutes);

/** "Ingen grundtid", "1 timme", "2 timmar". */
export function formatDailyLevel(minutes: number): string {
  if (minutes <= 0) return "Ingen grundtid";
  const hours = minutes / 60;
  return hours === 1 ? "1 timme" : `${hours} timmar`;
}

/** Today's date in Sweden ("2026-11-27"), the day the database gives base time for. */
export function stockholmDay(date = new Date()): string {
  // Built from parts: how a locale writes whole dates differs between browsers.
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export interface DailyClaim {
  day: string;
  /** Base time counted for today (may differ from the level if a parent changed it after use). */
  dayMinutes: number;
  /** Added to the balance by this call. */
  grantedMinutes: number;
  /** Unused base time from the previous day removed by this call. */
  expiredMinutes: number;
  balance: number;
}

const claimSchema = z.object({
  day: z.string(),
  day_minutes: z.number().int().min(0),
  granted_minutes: z.number().int().min(0),
  expired_minutes: z.number().int().min(0),
  balance: z.number().int(),
});

/** Gives today's base time if it has not been given yet (child or linked parent). Safe to repeat. */
export async function claimDailyScreenTime(childId: string): Promise<DailyClaim> {
  const { data, error } = await untypedRpc("claim_daily_screen_time", { p_child_id: childId });
  if (error) throw error;
  const saved = claimSchema.parse(data);
  return {
    day: saved.day,
    dayMinutes: saved.day_minutes,
    grantedMinutes: saved.granted_minutes,
    expiredMinutes: saved.expired_minutes,
    balance: saved.balance,
  };
}

const setSchema = z.object({ minutes: z.number().int(), today_change: z.number().int(), balance: z.number().int() });

/** Saves a parent's choice. If today's base time was already given, the difference applies right away. */
export async function setDailyScreenTime(childId: string, minutes: DailyLevel) {
  const { data, error } = await untypedRpc("set_daily_screen_time", { p_child_id: childId, p_minutes: minutes });
  if (error) throw error;
  const saved = setSchema.parse(data);
  return { minutes: saved.minutes, todayChange: saved.today_change, balance: saved.balance };
}

/** The parent's current choice for a child; 0 when none has been made. */
export async function loadDailyScreenTime(childId: string): Promise<DailyLevel> {
  const { data, error } = await untypedFrom("daily_screen_time_settings").select("minutes").eq("child_id", childId).maybeSingle();
  if (error) throw error;
  const minutes = (data as { minutes?: unknown } | null)?.minutes ?? 0;
  return isDailyLevel(minutes) ? minutes : 0;
}

/** The database has no daily base time yet (the migration has not been run). */
export function missingInDatabase(error: unknown): boolean {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  return code === "PGRST202" || code === "PGRST205" || code === "42P01" || code === "42883"
    || /could not find the (function|table)|does not exist/i.test(message ?? "");
}

const RETRY_MS = 60_000;

/**
 * Claims each child's base time once per Swedish day per app run. Never throws: a failure
 * (offline, or the database function not added yet) is retried after a minute.
 */
export function createDailyClaimer(claim = claimDailyScreenTime, now = () => Date.now(), today = () => stockholmDay()) {
  const done = new Map<string, string>();
  const retryAt = new Map<string, number>();
  const running = new Set<string>();
  return async (childId: string): Promise<DailyClaim | null> => {
    const day = today();
    if (done.get(childId) === day || running.has(childId) || now() < (retryAt.get(childId) ?? 0)) return null;
    running.add(childId);
    try {
      const result = await claim(childId);
      done.set(childId, day);
      retryAt.delete(childId);
      return result;
    } catch (error) {
      retryAt.set(childId, now() + RETRY_MS);
      if (!missingInDatabase(error)) console.warn("Kunde inte hämta dagens grundtid:", error);
      return null;
    } finally {
      running.delete(childId);
    }
  };
}

/** Shared by the child's app (ScreenTimeProvider) and the parent's overview. */
export const claimDailyScreenTimeOnce = createDailyClaimer();
