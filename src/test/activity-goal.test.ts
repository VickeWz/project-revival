import { describe, expect, it, vi } from "vitest";
import { importLegacyGoal, LEGACY_GOAL_KEY, validStepGoal } from "@/lib/activity-goal";

describe("shared step goal", () => {
  it("transfers the phone's saved 7500-step goal and deletes it after saving", async () => {
    const storage = { getItem: vi.fn(() => "7500"), removeItem: vi.fn() };
    const save = vi.fn(async (goal: number) => goal);
    expect(await importLegacyGoal(null, storage, save)).toBe(7500);
    expect(save).toHaveBeenCalledWith(7500);
    expect(storage.removeItem).toHaveBeenCalledWith(LEGACY_GOAL_KEY);
  });
  it("does not replace a parent's saved 12500-step goal with the phone's old goal", async () => {
    const storage = { getItem: () => "7500", removeItem: vi.fn() };
    const save = vi.fn(async () => 7500);
    expect(await importLegacyGoal(12500, storage, save)).toBe(12500);
    expect(save).not.toHaveBeenCalled();
  });
  it("keeps the phone goal when transfer fails so it can retry", async () => {
    const storage = { getItem: () => "7500", removeItem: vi.fn() };
    await expect(importLegacyGoal(null, storage, async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
  it("uses the server result if another device saved a goal during transfer", async () => {
    expect(await importLegacyGoal(null, { getItem: () => "7500", removeItem: vi.fn() }, async () => 15000)).toBe(15000);
  });
  it("retains the existing allowed range and rejects malformed goals", () => {
    expect(validStepGoal(1000)).toBe(true);
    expect(validStepGoal(50000)).toBe(true);
    for (const goal of [999, 50001, NaN, 7500.5]) expect(validStepGoal(goal)).toBe(false);
  });
});