import { format, startOfDay, subDays } from "date-fns";
import { z } from "zod";
import { earnedScreenMinutes } from "@/lib/pass-metrics";
import { untypedRpc } from "@/lib/untyped-db";

/** Same upper bound as claim_daily_steps in the database. */
export const MAX_DAILY_STEPS = 100000;

export interface StepClaim {
  /** Minutes added by this call. */
  earnedMinutes: number;
  /** All minutes from movement that day: passes and daily steps together. */
  dayMinutes: number;
  balance: number;
}

const inputSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0),
});
const resultSchema = z.object({
  earned_minutes: z.number().int().min(0),
  day_minutes: z.number().int().min(0),
  balance: z.number().int(),
});

/**
 * Turns a day's HealthKit step total into screen time. The server only adds the whole minutes
 * not already earned that day (passes included), so repeated or retried claims never double-credit.
 */
export async function claimDailySteps(steps: number, day: string): Promise<StepClaim> {
  const input = inputSchema.parse({ day, steps });
  const { data, error } = await untypedRpc("claim_daily_steps", {
    p_day: input.day,
    p_steps: Math.min(input.steps, MAX_DAILY_STEPS),
  });
  if (error) throw error;
  const saved = resultSchema.parse(data);
  return { earnedMinutes: saved.earned_minutes, dayMinutes: saved.day_minutes, balance: saved.balance };
}

/**
 * Foreground claims from Hem: one call at a time, at most every 15 seconds, and only when
 * the total has reached a whole minute the server has not confirmed for that day yet.
 */
export function createStepRewardSync(claim = claimDailySteps, now = Date.now) {
  const confirmed = new Map<string, number>();
  let pending = false;
  let lastAt = -Infinity;
  return async (steps: number, day: string): Promise<StepClaim | null> => {
    const known = confirmed.get(day);
    if (pending || now() - lastAt < 15000) return null;
    if (known !== undefined && earnedScreenMinutes(steps) <= known) return null;
    pending = true;
    lastAt = now();
    try {
      const result = await claim(steps, day);
      confirmed.set(day, result.dayMinutes);
      return result;
    } finally {
      pending = false;
    }
  };
}

const yesterdayDone = new Set<string>();

/**
 * Steps taken after Hem was last open yesterday still count: claim yesterday's final total
 * once per app run. Failures are forgotten so the next visit to Hem tries again.
 */
export async function claimYesterdayOnce(
  profileId: string,
  readSteps: (start: Date, end: Date) => Promise<number>,
  claim = claimDailySteps,
  today = new Date(),
): Promise<StepClaim | null> {
  const start = startOfDay(subDays(today, 1));
  const day = format(start, "yyyy-MM-dd");
  const key = `${profileId}:${day}`;
  if (yesterdayDone.has(key)) return null;
  yesterdayDone.add(key);
  try {
    const steps = await readSteps(start, startOfDay(today));
    return steps >= 200 ? await claim(steps, day) : null;
  } catch (error) {
    yesterdayDone.delete(key);
    throw error;
  }
}
