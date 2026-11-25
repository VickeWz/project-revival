import { describe, expect, it } from "vitest";
import { pairingCodeSchema, secondsLeft } from "@/lib/pairing-code";

describe("pairing code rules", () => {
  it("accepts exactly six digits including leading zeros", () => {
    expect(pairingCodeSchema.parse("001234")).toBe("001234");
    for (const code of ["12345", "1234567", "abcdef"]) expect(pairingCodeSchema.safeParse(code).success).toBe(false);
  });
  it("counts down a ten-minute code and expires exactly at its deadline", () => {
    const start = Date.parse("2026-11-25T19:00:00Z");
    expect(secondsLeft("2026-11-25T19:10:00Z", start)).toBe(600);
    expect(secondsLeft("2026-11-25T19:10:00Z", start + 600000)).toBe(0);
  });
  it("counts down the fifteen-minute account lockout", () => {
    expect(secondsLeft("2026-11-25T19:15:00Z", Date.parse("2026-11-25T19:00:00Z"))).toBe(900);
  });
});