import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { appsSignature, cleanApps, createAppSharer } from "@/lib/child-apps";
import { cleanPackages, toNativeLimits } from "@/lib/device-rules";
import { describeApps } from "@/components/parent/ChildAppPicker";

const tiktok = { id: "com.zhiliaoapp.musically", name: "TikTok" };
const youtube = { id: "com.google.android.youtube", name: "YouTube" };

describe("apps a parent picks for app limits", () => {
  it("keeps only valid, unique apps sorted by name", () => {
    expect(cleanApps([youtube, tiktok, { id: "com.zhiliaoapp.musically", name: "Dubbel" }, { id: "not a package", name: "X" }, { id: "a.b", name: "  " }, null]))
      .toEqual([tiktok, youtube]);
    expect(cleanApps([{ id: "com.example.app", name: `  ${"A".repeat(120)}  ` }])[0]!.name).toHaveLength(100);
  });

  it("sends picked apps to the phone only when a parent picked some", () => {
    expect(toNativeLimits([
      { id: "b", app_name: "Spel", daily_limit_minutes: 30, is_enabled: true, app_packages: ["com.roblox.client", "com.roblox.client", "bad name"] },
      { id: "a", app_name: "Video", daily_limit_minutes: 60, is_enabled: true, app_packages: [] },
      { id: "c", app_name: "Av", daily_limit_minutes: 60, is_enabled: false, app_packages: ["com.roblox.client"] },
    ])).toEqual([
      { id: "a", minutes: 60 },
      { id: "b", minutes: 30, apps: ["com.roblox.client"] },
    ]);
    expect(cleanPackages(null)).toEqual([]);
  });

  it("describes the picked apps for the parent", () => {
    expect(describeApps([], [tiktok])).toBe("");
    expect(describeApps([tiktok.id], [tiktok, youtube])).toBe("TikTok");
    expect(describeApps([tiktok.id, youtube.id], [tiktok, youtube])).toBe("TikTok och YouTube");
    expect(describeApps([tiktok.id, youtube.id, "com.a.b", "com.c.d"], [tiktok, youtube, { id: "com.a.b", name: "A" }, { id: "com.c.d", name: "C" }]))
      .toBe("TikTok, YouTube och 2 till");
  });
});

describe("sharing the phone's apps with parents", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
  };

  it("uploads only when the list changed, at most every 6 hours", async () => {
    let now = 0;
    let list: unknown[] = [tiktok];
    const uploads: string[] = [];
    const share = createAppSharer({
      list: async () => list,
      upload: async (apps) => void uploads.push(appsSignature(apps)),
      storage: memory(),
      now: () => now,
    });
    expect(await share("child")).toBe(true);
    expect(await share("child")).toBe(false);
    now = 7 * 60 * 60 * 1000;
    expect(await share("child")).toBe(false);
    list = [tiktok, youtube];
    now = 14 * 60 * 60 * 1000;
    expect(await share("child")).toBe(true);
    expect(uploads).toHaveLength(2);
  });

  it("never throws and tries again on the next start", async () => {
    let fail = true;
    const storage = memory();
    const make = () => createAppSharer({
      list: async () => [tiktok],
      upload: async () => { if (fail) throw new Error("Could not find the function sync_child_apps"); },
      storage,
      now: () => 0,
    });
    expect(await make()("child")).toBe(false);
    fail = false;
    expect(await make()("child")).toBe(true);
  });
});
