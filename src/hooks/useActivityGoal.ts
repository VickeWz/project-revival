import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_STEP_GOAL, importLegacyGoal, validStepGoal } from "@/lib/activity-goal";

export function useActivityGoal(childId?: string) {
  const { profile } = useAuth();
  const profileId = childId ?? (profile?.role === "child" ? profile.id : undefined);
  const queryClient = useQueryClient();
  const queryKey = ["activity-goal", profileId];
  const save = async (goal: number, importing: boolean) => {
    if (!profileId || !validStepGoal(goal)) throw new Error("Ogiltigt stegmål");
    const { data, error } = await supabase.rpc("set_daily_step_goal", {
      p_profile_id: profileId, p_goal: goal, p_import: importing,
    });
    if (error) throw error;
    if (!validStepGoal(data)) throw new Error("Kunde inte spara stegmålet");
    return data;
  };
  const query = useQuery({
    queryKey,
    enabled: Boolean(profileId),
    refetchInterval: 3000,
    queryFn: async () => {
      if (!profileId) throw new Error("Barnkonto saknas");
      const { data, error } = await supabase.from("profiles").select("daily_step_goal").eq("id", profileId).single();
      if (error) throw error;
      if (profileId === profile?.id && profile.role === "child") {
        return importLegacyGoal(data.daily_step_goal, localStorage, (goal) => save(goal, true));
      }
      return data.daily_step_goal ?? DEFAULT_STEP_GOAL;
    },
  });
  const updateGoal = async (goal: number) => {
    const saved = await save(goal, false);
    queryClient.setQueryData(queryKey, saved);
    await queryClient.invalidateQueries({ queryKey });
  };
  return { dailyStepGoal: query.data ?? DEFAULT_STEP_GOAL, updateGoal, loading: query.isPending, error: query.error };
}
