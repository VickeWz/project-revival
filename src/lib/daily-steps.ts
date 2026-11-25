import { format } from "date-fns";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const dailyStepsSchema = z.object({
  child_id: z.string().uuid(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0).max(1000000),
});

export async function saveDailySteps(childId: string, steps: number, day = format(new Date(), "yyyy-MM-dd")) {
  const row = dailyStepsSchema.parse({ child_id: childId, day, steps });
  const { error } = await supabase.from("current_daily_steps").upsert(row, { onConflict: "child_id" });
  if (error) throw error;
}

/** Single in-flight write, only changed readings, with bounded foreground sync frequency. */
export function createDailyStepSync(childId: string, save = saveDailySteps, now = Date.now) {
  let lastKey: string | null = null;
  let lastSavedAt = -Infinity;
  let pending = false;
  return async (steps: number, day: string) => {
    const key = `${day}:${steps}`;
    if (pending || key === lastKey || now() - lastSavedAt < 30000) return;
    pending = true;
    try {
      await save(childId, steps, day);
      lastKey = key;
      lastSavedAt = now();
    } finally { pending = false; }
  };
}