import { beforeEach, describe, expect, it, vi } from "vitest";
const { upsert, from } = vi.hoisted(() => ({ upsert: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { saveDailySteps, createDailyStepSync } from "@/lib/daily-steps";
const child = "427a6b75-72e3-4848-a4ee-6448d7e5e289";
beforeEach(() => { vi.clearAllMocks(); from.mockReturnValue({ upsert }); upsert.mockResolvedValue({ error: null }); });
describe("daily step sharing", () => {
  it("saves only the child, date and total, without touching balance or credited activity", async () => {
    await saveDailySteps(child, 1234, "2026-11-25");
    expect(from.mock.calls).toEqual([["current_daily_steps"]]);
    expect(upsert).toHaveBeenCalledWith({ child_id: child, day: "2026-11-25", steps: 1234 }, { onConflict: "child_id" });
  });
  it("replaces the same child row rather than appending detailed history", async () => {
    await saveDailySteps(child, 1234, "2026-11-25");
    await saveDailySteps(child, 10, "2026-11-26");
    expect(upsert).toHaveBeenLastCalledWith({ child_id: child, day: "2026-11-26", steps: 10 }, { onConflict: "child_id" });
  });
  it("does not save invalid or fabricated measurements", async () => {
    for (const steps of [-1, NaN, 1.5]) await expect(saveDailySteps(child, steps)).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });
  it("limits writes and retries failures without marking them saved", async () => {
    let now = 0;
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const sync = createDailyStepSync(child, save, () => now);
    await expect(sync(1234, "2026-11-25")).rejects.toThrow("offline");
    await sync(1234, "2026-11-25");
    await sync(1234, "2026-11-25");
    await sync(1235, "2026-11-25");
    expect(save).toHaveBeenCalledTimes(2);
    now = 30000;
    await sync(1235, "2026-11-25");
    expect(save).toHaveBeenCalledTimes(3);
  });
});