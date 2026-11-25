import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface ParentInfo {
  id: string;
  name: string;
  avatar: string | null;
}

/** The parent linked to the signed-in child, kept current when a parent links the account. */
export function useParentLink() {
  const { profile } = useAuth();
  const [parent, setParent] = useState<ParentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const childId = profile?.id;
    if (!childId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const { data: link, error } = await supabase
          .from("parent_child_links")
          .select("parent_id")
          .eq("child_id", childId)
          .maybeSingle();
        if (error) throw error;
        if (!link) {
          if (!cancelled) setParent(null);
          return;
        }
        const { data: parentProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("id", link.parent_id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!cancelled) {
          setParent(
            parentProfile
              ? { id: parentProfile.id, name: parentProfile.display_name, avatar: parentProfile.avatar_url }
              : null,
          );
        }
      } catch (error) {
        console.error("Error fetching parent link:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const channel = supabase
      .channel(`parent-child-links-${childId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "parent_child_links", filter: `child_id=eq.${childId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return { parent, loading };
}
