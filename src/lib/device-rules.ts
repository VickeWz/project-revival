/**
 * Turns the parents' downtime schedules and app limits (database rows) into the rules the
 * iPhone plugin enforces. Pure functions so the mapping can be tested without a phone.
 */

export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export const DAY_LABELS: Record<DayKey, string> = { Mon: "Mån", Tue: "Tis", Wed: "Ons", Thu: "Tor", Fri: "Fre", Sat: "Lör", Sun: "Sön" };
/** Apple's Calendar weekday numbers: 1 = Sunday … 7 = Saturday. */
const APPLE_WEEKDAY: Record<DayKey, number> = { Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7 };

/** Apple's DeviceActivity intervals must be at least 15 minutes. */
export const MIN_DOWNTIME_MINUTES = 15;
export const MIN_LIMIT_MINUTES = 1;
export const MAX_LIMIT_MINUTES = 24 * 60;

export interface DowntimeRow {
  start_time: string;
  end_time: string;
  days_enabled: string[];
  is_enabled: boolean;
}
export interface NativeDowntime { weekdays: number[]; start: number; end: number }

export interface LimitRow {
  id: string;
  app_name: string;
  daily_limit_minutes: number;
  is_enabled: boolean;
}
export interface NativeLimit { id: string; minutes: number }

/** "21:00" or "21:00:00" → minutes after midnight, or null. */
export function clockToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/** Length of a downtime; an end before the start means it ends the next morning. */
export function downtimeLength(start: number, end: number): number {
  return end > start ? end - start : 24 * 60 - start + end;
}

export function isValidDowntime(start: number | null, end: number | null, days: readonly string[]): boolean {
  return start !== null && end !== null && start !== end && days.some((day) => DAY_KEYS.includes(day as DayKey))
    && downtimeLength(start, end) >= MIN_DOWNTIME_MINUTES;
}

export function toNativeDowntimes(rows: readonly DowntimeRow[]): NativeDowntime[] {
  return rows.flatMap((row) => {
    const start = clockToMinutes(row.start_time);
    const end = clockToMinutes(row.end_time);
    if (!row.is_enabled || start === null || end === null || !isValidDowntime(start, end, row.days_enabled)) return [];
    const weekdays = [...new Set(row.days_enabled.filter((day): day is DayKey => DAY_KEYS.includes(day as DayKey)).map((day) => APPLE_WEEKDAY[day]))].sort((a, b) => a - b);
    return [{ weekdays, start, end }];
  });
}

export function toNativeLimits(rows: readonly LimitRow[]): NativeLimit[] {
  return rows
    .filter((row) => row.is_enabled && Number.isInteger(row.daily_limit_minutes)
      && row.daily_limit_minutes >= MIN_LIMIT_MINUTES && row.daily_limit_minutes <= MAX_LIMIT_MINUTES)
    .map((row) => ({ id: row.id, minutes: row.daily_limit_minutes }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** "HH:MM" in Swedish time format for a timestamp in milliseconds. */
export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

/** Whole minutes from now until `ms`, never negative. */
export function minutesUntil(ms: number, now = Date.now()): number {
  return Math.max(0, Math.floor((ms - now) / 60000));
}

/** For the parent: "21:00–07:00 alla dagar", "vardagar", "helger" or a list of days. */
export function describeDowntime(row: DowntimeRow | null): string {
  if (!row || !row.is_enabled) return "Av";
  const days = DAY_KEYS.filter((day) => row.days_enabled.includes(day));
  const range = `${row.start_time.slice(0, 5)}–${row.end_time.slice(0, 5)}`;
  const weekdays: readonly DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const label = days.length === 7 ? "alla dagar"
    : days.length === 5 && weekdays.every((day) => days.includes(day)) ? "vardagar"
    : days.length === 2 && days.includes("Sat") && days.includes("Sun") ? "helger"
    : days.map((day) => DAY_LABELS[day].toLowerCase()).join(", ");
  return days.length ? `${range} ${label}` : "Inga dagar valda";
}
