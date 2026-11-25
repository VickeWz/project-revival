import { describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { completeTaskRound, createTaskRound, taskRoundMinutes, TASK_DAILY_LIMIT, TASK_ROUND_SIZE } from "@/lib/tasks/rewards";
import type { Level, Subject } from "@/lib/tasks/questions";

const subjects: Subject[] = ["matte", "svenska", "engelska"];
const levels: Level[] = [1, 2, 3];

describe("task rounds", () => {
  it.each(subjects.flatMap((subject) => levels.map((level) => [subject, level] as const)))(
    "builds valid %s rounds on level %i",
    (subject, level) => {
      for (let i = 0; i < 100; i++) {
        const round = createTaskRound(subject, level);
        expect(round).toHaveLength(TASK_ROUND_SIZE);
        expect(new Set(round.map((q) => q.prompt)).size).toBe(TASK_ROUND_SIZE);
        for (const question of round) {
          expect(question.options.length).toBeGreaterThanOrEqual(2);
          expect(new Set(question.options).size).toBe(question.options.length);
          expect(question.options[question.answer]).toBeTruthy();
          if (subject === "matte") expect(question.explanation?.endsWith(question.options[question.answer]!)).toBe(true);
        }
      }
    },
  );

  it("gives one minute per right answer up to the daily limit", () => {
    expect(taskRoundMinutes(4, 0)).toBe(4);
    expect(taskRoundMinutes(5, TASK_DAILY_LIMIT - 2)).toBe(2);
    expect(taskRoundMinutes(5, TASK_DAILY_LIMIT)).toBe(0);
  });

  it("saves a round with its own id so a retry cannot double-credit", async () => {
    rpc.mockResolvedValue({ data: { earned_minutes: 3, today_minutes: 8, balance: 30 }, error: null });
    const startedAt = new Date("2026-11-25T10:00:00Z");
    const round = { id: "8f0e3d3c-7c0b-4d0e-9a52-0c6a7c1d2e11", subject: "svenska" as const, level: 2 as const, correct: 3, total: 5, startedAt };
    await expect(completeTaskRound(round)).resolves.toEqual({ earnedMinutes: 3, todayMinutes: 8, balance: 30 });
    await completeTaskRound(round);
    expect(rpc.mock.calls[0]).toEqual(["complete_task_round", {
      p_id: round.id, p_subject: "svenska", p_level: 2, p_correct: 3, p_total: 5, p_started_at: startedAt.toISOString(),
    }]);
    expect(rpc.mock.calls[1]).toEqual(rpc.mock.calls[0]);
  });
});
