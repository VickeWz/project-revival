import { createFileRoute } from "@tanstack/react-router";
import { authenticate, corsHeaders, json } from "@/lib/native-api.server";
import { linkChildInput, runLinkChild } from "@/lib/link-child.server";

// Used by the bundled iPhone app, which cannot call same-origin server functions.
export const Route = createFileRoute("/api/public/native/link-child")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const caller = await authenticate(request);
        if (!caller) return json(request, { error: "Unauthorized" }, 401);
        const parsed = linkChildInput.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json(request, { error: "Invalid input" }, 400);
        return json(request, await runLinkChild(caller.supabase, caller.userId, parsed.data));
      },
    },
  },
});
