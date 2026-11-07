import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { linkChildInput, runLinkChild } from "./link-child.server";

export const linkChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => linkChildInput.parse(d))
  .handler(async ({ data, context }) => runLinkChild(context.supabase, context.userId, data));
