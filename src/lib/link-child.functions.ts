import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Replaces the former link-child backend function: a parent proves knowledge of the
// child's credentials, then the link is written with admin rights.
export const linkChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ childEmail: z.string().email().max(255), childPassword: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: parentProfile } = await context.supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!parentProfile || parentProfile.role !== "parent") return { error: "Only parents can add children" };

    const check = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: childAuth, error: childAuthError } = await check.auth.signInWithPassword({
      email: data.childEmail,
      password: data.childPassword,
    });
    if (childAuthError || !childAuth.user) return { error: "Invalid child credentials" };
    await check.auth.signOut();

    const { data: childProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, display_name")
      .eq("user_id", childAuth.user.id)
      .maybeSingle();
    if (!childProfile) return { error: "Child profile not found" };
    if (childProfile.role !== "child") return { error: "This account is not a child account" };

    const { data: existing } = await supabaseAdmin
      .from("parent_child_links")
      .select("id")
      .eq("parent_id", parentProfile.id)
      .eq("child_id", childProfile.id)
      .maybeSingle();
    if (existing) return { error: "This child is already linked to your account" };

    const { error: linkError } = await supabaseAdmin
      .from("parent_child_links")
      .insert({ parent_id: parentProfile.id, child_id: childProfile.id });
    if (linkError) return { error: "Failed to link child account" };

    return {
      success: true,
      childName: childProfile.display_name,
      message: `Successfully linked ${childProfile.display_name} to your account`,
    };
  });
