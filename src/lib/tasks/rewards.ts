import { z } from "zod";
import { format } from "date-fns";
import { untypedFrom, untypedRpc } from "@/lib/untyped-db";
import { buildRound, type Level, type Rng, type Subject, type TaskQuestion } from "./questions";
import { MATH } from "./math";
import { SWEDISH } from "./svenska";
import { ENGLISH } from "./engelska";

// Keep in line with complete_task_round in the database.
export const TASK_ROUND_SIZE = 5;
export const MINUTES_PER_CORRECT = 1;
export const TASK_DAILY_LIMIT = 20;

const GENERATORS = { matte: MATH, svenska: SWEDISH, engelska: ENGLISH } as const;

export function createTaskRound(subject: Subject, level: Level, rng: Rng = Math.random): TaskQuestion[] {
  return buildRound(GENERATORS[subject][level], TASK_ROUND_SIZE, rng);
}

/** What the server will credit: one minute per right answer, up to what is left of today's limit. */
export function taskRoundMinutes(correct: number, earnedToday: number): number {
  return Math.max(0, Math.min(correct * MINUTES_PER_CORRECT, TASK_DAILY_LIMIT - earnedToday));
}

export interface TaskRoundResult {
  earnedMinutes: number;
  todayMinutes: number;
  balance: number;
}

const resultSchema = z.object({
  earned_minutes: z.number().int().min(0),
  today_minutes: z.number().int().min(0),
  balance: z.number().int(),
});

/**
 * Saves a finished round. The id is created when the round starts and reused on retry,
 * so a retried save returns the first result instead of crediting twice.
 */
export async function completeTaskRound(round: {
  id: string;
  subject: Subject;
  level: Level;
  correct: number;
  total: number;
  startedAt: Date;
}): Promise<TaskRoundResult> {
  const { data, error } = await untypedRpc("complete_task_round", {
    p_id: round.id,
    p_subject: round.subject,
    p_level: round.level,
    p_correct: round.correct,
    p_total: round.total,
    p_started_at: round.startedAt.toISOString(),
  });
  if (error) throw error;
  const saved = resultSchema.parse(data);
  return { earnedMinutes: saved.earned_minutes, todayMinutes: saved.today_minutes, balance: saved.balance };
}

/** Minutes from tasks today, or null when they cannot be read. */
export async function loadTaskMinutesToday(profileId: string): Promise<number | null> {
  const { data, error } = await untypedFrom("task_rounds")
    .select("earned_minutes")
    .eq("profile_id", profileId)
    .eq("day", format(new Date(), "yyyy-MM-dd"));
  if (error) return null;
  return ((data ?? []) as Array<{ earned_minutes: number }>).reduce((sum, row) => sum + row.earned_minutes, 0);
}
