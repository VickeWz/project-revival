import { createFileRoute } from "@tanstack/react-router";
import { authenticate, corsHeaders, json } from "@/lib/native-api.server";
import { activitySummaryInput } from "@/lib/activity-summary";
import { runSummarizeActivity } from "@/lib/activity-summary.server";

// Used by the bundled iPhone app, which cannot call same-origin server functions.
export const Route = createFileRoute("/api/public/native/activity-summary")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const caller = await authenticate(request);
        if (!caller) return json(request, { error: "Unauthorized" }, 401);
        const parsed = activitySummaryInput.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json(request, { error: "Invalid input" }, 400);
        try {
          return json(request, await runSummarizeActivity(caller.supabase, caller.userId, parsed.data));
        } catch (e) {
          return json(request, { error: e instanceof Error ? e.message : "Failed" }, 403);
        }
      },
    },
  },
});
