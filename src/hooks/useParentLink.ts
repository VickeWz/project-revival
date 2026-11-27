import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Every subscription gets its own realtime channel name. supabase.channel() hands back an already
// subscribed channel with the same name (also one still closing), and adding a listener to it throws.
// That crashed Hem when the parent-code form in the lock settings opened next to "Be om mer tid".
let channelCount = 0;

export interface ParentInfo {
  id: string;
  name: string;
  avatar: string | null;
}

/**
 * The parents linked to the signed-in child (a child can have more than one), oldest link first,
 * kept current when a parent links the account. `parent` is the first one and receives requests for time.
 */
export function useParentLink() {
  const { profile } = useAuth();
  const [parents, setParents] = useState<ParentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const childId = profile?.id;
    if (!childId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const { data: links, error } = await supabase
          .from("parent_child_links")
          .select("parent_id")
          .eq("child_id", childId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        const ids = (links ?? []).map((link) => link.parent_id);
        if (ids.length === 0) {
          if (!cancelled) setParents([]);
          return;
        }
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", ids);
        if (profileError) throw profileError;
        if (!cancelled) {
          setParents(
            ids.flatMap((id) => {
              const found = profiles?.find((row) => row.id === id);
              return found ? [{ id: found.id, name: found.display_name, avatar: found.avatar_url }] : [];
            }),
          );
        }
      } catch (error) {
        console.error("Error fetching parent link:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 3000);
    const channel = supabase
      .channel(`parent-child-links-${childId}-${++channelCount}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "parent_child_links", filter: `child_id=eq.${childId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return { parent: parents[0] ?? null, parents, loading };
}
