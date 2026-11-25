import { describe, expect, it } from "vitest";
import { unlockMinutesRemaining } from "@/lib/parent-unlock";

describe("parent active unlock remaining time", () => {
  const now = Date.parse("2026-11-25T19:00:00Z");
  it("shows five minutes for an active five minute window", () => {
    expect(unlockMinutesRemaining("2026-11-25T19:05:00Z", now)).toBe(5);
  });
  it("rounds a remaining partial minute up instead of claiming it has ended", () => {
    expect(unlockMinutesRemaining("2026-11-25T19:00:01Z", now)).toBe(1);
  });
  it("hides the unlock at and after its absolute expiry", () => {
    expect(unlockMinutesRemaining("2026-11-25T19:00:00Z", now)).toBe(0);
    expect(unlockMinutesRemaining("2026-11-25T18:59:00Z", now)).toBe(0);
  });
  it("does not invent an unlock for missing or invalid data", () => {
    expect(unlockMinutesRemaining(null, now)).toBe(0);
    expect(unlockMinutesRemaining("invalid", now)).toBe(0);
  });
});