import { untypedFrom, untypedRpc } from "@/lib/untyped-db";
import { screenTimePlugin } from "@/services/screenTime";

/**
 * The apps on the child's Android phone (name and package), shared with linked parents so they can
 * pick apps for app limits in the parent app. Only home-screen apps; no icons, usage or other data.
 * iPhone cannot share this (Apple keeps app choices on the phone), so there apps are chosen on the phone.
 */
export interface ChildApp {
  /** Android package name, e.g. "com.zhiliaoapp.musically". */
  id: string;
  name: string;
}

const PACKAGE_NAME = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/;
const MAX_APPS = 500;

/** Valid, unique apps with trimmed names, sorted by name like on the phone. */
export function cleanApps(apps: readonly unknown[]): ChildApp[] {
  const byId = new Map<string, ChildApp>();
  for (const app of apps) {
    const { id, name } = (app ?? {}) as { id?: unknown; name?: unknown };
    if (typeof id !== "string" || id.length > 255 || !PACKAGE_NAME.test(id) || typeof name !== "string") continue;
    const label = name.trim().slice(0, 100);
    if (label && !byId.has(id)) byId.set(id, { id, name: label });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "sv")).slice(0, MAX_APPS);
}

/** Changes whenever an app is added, removed or renamed. */
export const appsSignature = (apps: readonly ChildApp[]) => apps.map((app) => `${app.id}=${app.name}`).join("\n");

const SHARE_INTERVAL_MS = 6 * 60 * 60 * 1000;

interface SharerDeps {
  list: () => Promise<unknown[]>;
  upload: (apps: ChildApp[]) => Promise<void>;
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  now: () => number;
}

/**
 * Shares the list at most every 6 hours per app run, and only uploads when it changed since the
 * last upload. Never throws: the next app start tries again.
 */
export function createAppSharer({ list, upload, storage, now }: SharerDeps) {
  const lastRun = new Map<string, number>();
  return async (profileId: string): Promise<boolean> => {
    const last = lastRun.get(profileId);
    if (last !== undefined && now() - last < SHARE_INTERVAL_MS) return false;
    lastRun.set(profileId, now());
    try {
      const apps = cleanApps(await list());
      const key = `gamerun.sharedApps.${profileId}`;
      const signature = appsSignature(apps);
      let saved: string | null = null;
      try { saved = storage?.getItem(key) ?? null; } catch { /* storage unavailable: upload again */ }
      if (saved === signature) return false;
      await upload(apps);
      try { storage?.setItem(key, signature); } catch { /* the next start uploads again */ }
      return true;
    } catch (error) {
      console.warn("Kunde inte dela telefonens appar med föräldern:", error);
      return false;
    }
  };
}

/** The child's phone (Android): share its apps with linked parents. */
export const shareInstalledAppsOnce = createAppSharer({
  list: async () => (await screenTimePlugin.installedApps()).apps,
  upload: async (apps) => {
    const { error } = await untypedRpc("sync_child_apps", { p_apps: apps });
    if (error) throw error;
  },
  storage: typeof localStorage === "undefined" ? null : localStorage,
  now: () => Date.now(),
});

/** For the parent: the apps on the child's phone, or [] when it has shared none (iPhone, or not yet). */
export async function loadChildApps(childId: string): Promise<ChildApp[]> {
  const { data, error } = await untypedFrom("child_apps").select("package_name, label").eq("child_id", childId);
  if (error) throw error;
  const rows = (data ?? []) as { package_name: string; label: string }[];
  return cleanApps(rows.map((row) => ({ id: row.package_name, name: row.label })));
}
