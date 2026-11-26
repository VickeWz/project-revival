import { describe, expect, it } from "vitest";
import {
  clockToMinutes, describeDowntime, downtimeLength, isValidDowntime, minutesUntil, toNativeDowntimes, toNativeLimits,
} from "@/lib/device-rules";

const everyDay = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

describe("downtime rules for the iPhone", () => {
  it("maps database rows to Apple weekdays (1 = Sunday) and minutes after midnight", () => {
    expect(toNativeDowntimes([{ start_time: "21:00:00", end_time: "07:00:00", days_enabled: ["Sun", "Mon", "Sat"], is_enabled: true }]))
      .toEqual([{ weekdays: [1, 2, 7], start: 21 * 60, end: 7 * 60 }]);
  });

  it("skips disabled, too short and unreadable schedules", () => {
    expect(toNativeDowntimes([
      { start_time: "21:00", end_time: "07:00", days_enabled: everyDay, is_enabled: false },
      { start_time: "21:00", end_time: "21:10", days_enabled: everyDay, is_enabled: true },
      { start_time: "21:00", end_time: "21:00", days_enabled: everyDay, is_enabled: true },
      { start_time: "25:00", end_time: "07:00", days_enabled: everyDay, is_enabled: true },
      { start_time: "21:00", end_time: "07:00", days_enabled: [], is_enabled: true },
    ])).toEqual([]);
  });

  it("measures schedules across midnight and requires 15 minutes", () => {
    expect(clockToMinutes("07:30")).toBe(450);
    expect(downtimeLength(21 * 60, 7 * 60)).toBe(10 * 60);
    expect(downtimeLength(8 * 60, 15 * 60)).toBe(7 * 60);
    expect(isValidDowntime(23 * 60 + 50, 5, ["Mon"])).toBe(true);
    expect(isValidDowntime(23 * 60 + 50, 0, ["Mon"])).toBe(false);
  });

  it("describes a schedule for the parent", () => {
    expect(describeDowntime({ start_time: "21:00:00", end_time: "07:00:00", days_enabled: everyDay, is_enabled: true })).toBe("21:00–07:00 alla dagar");
    expect(describeDowntime({ start_time: "20:00", end_time: "06:30", days_enabled: ["Mon", "Tue", "Wed", "Thu", "Fri"], is_enabled: true })).toBe("20:00–06:30 vardagar");
    expect(describeDowntime({ start_time: "20:00", end_time: "06:30", days_enabled: everyDay, is_enabled: false })).toBe("Av");
    expect(describeDowntime(null)).toBe("Av");
  });
});

describe("app limits for the iPhone", () => {
  it("sends only enabled limits with whole minutes, in a stable order", () => {
    expect(toNativeLimits([
      { id: "b", app_name: "Spel", daily_limit_minutes: 60, is_enabled: true },
      { id: "a", app_name: "Sociala medier", daily_limit_minutes: 30, is_enabled: true },
      { id: "c", app_name: "Video", daily_limit_minutes: 30, is_enabled: false },
      { id: "d", app_name: "Fel", daily_limit_minutes: 0, is_enabled: true },
      { id: "e", app_name: "Fel", daily_limit_minutes: 2000, is_enabled: true },
    ])).toEqual([{ id: "a", minutes: 30 }, { id: "b", minutes: 60 }]);
  });

  it("counts whole minutes until the next downtime", () => {
    expect(minutesUntil(10 * 60000 + 59000, 0)).toBe(10);
    expect(minutesUntil(0, 5000)).toBe(0);
  });
});
