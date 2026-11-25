import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { claimDailySteps, claimYesterdayOnce, createStepRewardSync, MAX_DAILY_STEPS } from "@/lib/step-rewards";

beforeEach(() => { vi.clearAllMocks(); });

describe("daily step rewards", () => {
  it("sends the day's total and returns what the server credited", async () => {
    rpc.mockResolvedValue({ data: { earned_minutes: 5, day_minutes: 5, balance: 15 }, error: null });
    await expect(claimDailySteps(1000, "2026-11-25")).resolves.toEqual({ earnedMinutes: 5, dayMinutes: 5, balance: 15 });
    expect(rpc).toHaveBeenCalledWith("claim_daily_steps", { p_day: "2026-11-25", p_steps: 1000 });
  });

  it("caps unrealistic totals and rejects invalid readings", async () => {
    rpc.mockResolvedValue({ data: { earned_minutes: 0, day_minutes: 500, balance: 500 }, error: null });
    await claimDailySteps(MAX_DAILY_STEPS + 5000, "2026-11-25");
    expect(rpc).toHaveBeenCalledWith("claim_daily_steps", { p_day: "2026-11-25", p_steps: MAX_DAILY_STEPS });
    for (const steps of [-1, NaN, 1.5]) await expect(claimDailySteps(steps, "2026-11-25")).rejects.toThrow();
    await expect(claimDailySteps(10, "25/11")).rejects.toThrow();
  });

  it("claims only when a new whole minute is reachable, at most every 15 seconds", async () => {
    let now = 0;
    const claim = vi.fn(async (steps: number) => ({ earnedMinutes: 1, dayMinutes: Math.floor(steps / 200), balance: 0 }));
    const sync = createStepRewardSync(claim, () => now);
    await sync(450, "2026-11-25");
    expect(claim).toHaveBeenCalledTimes(1);
    now = 20000;
    await sync(599, "2026-11-25"); // still 2 whole minutes: nothing new to claim
    expect(claim).toHaveBeenCalledTimes(1);
    await sync(600, "2026-11-25");
    expect(claim).toHaveBeenCalledTimes(2);
    now = 25000;
    await sync(5000, "2026-11-25"); // throttled
    expect(claim).toHaveBeenCalledTimes(2);
    now = 40000;
    await sync(5000, "2026-11-26"); // a new day is always claimed
    expect(claim).toHaveBeenLastCalledWith(5000, "2026-11-26");
  });

  it("claims yesterday's total once per app run and retries after a failure", async () => {
    const claim = vi.fn().mockResolvedValue({ earnedMinutes: 3, dayMinutes: 10, balance: 3 });
    const read = vi.fn().mockRejectedValueOnce(new Error("Hälsa")).mockResolvedValue(2000);
    const today = new Date(2026, 10, 25, 9);
    await expect(claimYesterdayOnce("child", read, claim, today)).rejects.toThrow("Hälsa");
    await claimYesterdayOnce("child", read, claim, today);
    await claimYesterdayOnce("child", read, claim, today);
    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim).toHaveBeenCalledWith(2000, "2026-11-24");
    expect(read.mock.calls[1]).toEqual([new Date(2026, 10, 24), new Date(2026, 10, 25)]);
  });
});
