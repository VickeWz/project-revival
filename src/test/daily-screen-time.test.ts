import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import {
  DAILY_LEVELS,
  createDailyClaimer,
  formatDailyLevel,
  isDailyLevel,
  missingInDatabase,
  stockholmDay,
  type DailyClaim,
} from "@/lib/daily-screen-time";

const claimed = (grantedMinutes: number): DailyClaim => ({ day: "2026-11-27", dayMinutes: 60, grantedMinutes, expiredMinutes: 0, balance: 60 });

describe("daily base screen time", () => {
  it("offers exactly 0, 1, 2 and 3 hours", () => {
    expect([...DAILY_LEVELS]).toEqual([0, 60, 120, 180]);
    expect(isDailyLevel(120)).toBe(true);
    expect(isDailyLevel(90)).toBe(false);
    expect(isDailyLevel("60")).toBe(false);
    expect(DAILY_LEVELS.map(formatDailyLevel)).toEqual(["Ingen grundtid", "1 timme", "2 timmar", "3 timmar"]);
  });

  it("uses the Swedish calendar day", () => {
    expect(stockholmDay(new Date("2026-11-27T22:30:00Z"))).toBe("2026-11-27");
    expect(stockholmDay(new Date("2026-11-27T23:30:00Z"))).toBe("2026-11-28");
    expect(stockholmDay(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
  });

  it("claims once per child and day", async () => {
    let calls = 0;
    let day = "2026-11-27";
    const claim = createDailyClaimer(async () => { calls += 1; return claimed(60); }, () => 0, () => day);
    expect((await claim("child-1"))?.grantedMinutes).toBe(60);
    expect(await claim("child-1")).toBeNull();
    expect(calls).toBe(1);
    expect((await claim("child-2"))?.grantedMinutes).toBe(60);
    day = "2026-11-28";
    expect((await claim("child-1"))?.grantedMinutes).toBe(60);
    expect(calls).toBe(3);
  });

  it("never throws and retries a failed claim after a minute", async () => {
    let calls = 0;
    let now = 0;
    const claim = createDailyClaimer(async () => {
      calls += 1;
      if (calls === 1) throw { code: "PGRST202", message: "Could not find the function public.claim_daily_screen_time" };
      return claimed(120);
    }, () => now, () => "2026-11-27");
    expect(await claim("child-1")).toBeNull();
    now = 30_000;
    expect(await claim("child-1")).toBeNull();
    expect(calls).toBe(1);
    now = 61_000;
    expect((await claim("child-1"))?.grantedMinutes).toBe(120);
  });

  it("recognises a database that has not been updated yet", () => {
    expect(missingInDatabase({ code: "PGRST202" })).toBe(true);
    expect(missingInDatabase({ code: "42P01", message: 'relation "daily_screen_time_settings" does not exist' })).toBe(true);
    expect(missingInDatabase({ code: "P0001", message: "Not allowed" })).toBe(false);
    expect(missingInDatabase(null)).toBe(false);
  });
});
