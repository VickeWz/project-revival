import { describe, expect, it } from "vitest";
import { screenTimeFromSteps, stepsToNextReward } from "@/lib/screen-time";

describe("screen time from steps", () => {
  it("1000 steps earns 5 minutes", () => expect(screenTimeFromSteps(1000)).toBe(5));
  it("only full thousands count", () => expect(screenTimeFromSteps(2499)).toBe(10));
  it("under 1000 steps earns nothing", () => expect(screenTimeFromSteps(999)).toBe(0));
  it("steps left to next reward", () => expect(stepsToNextReward(2400)).toBe(600));
});
