import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activitySummaryInput } from "./activity-summary";
import { runSummarizeActivity } from "./activity-summary.server";

export const summarizeActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => activitySummaryInput.parse(input))
  .handler(async ({ data, context }) => runSummarizeActivity(context.supabase, context.userId, data));
