ALTER TABLE public.profiles ADD COLUMN daily_step_goal integer CHECK (daily_step_goal BETWEEN 1000 AND 50000);
COMMENT ON COLUMN public.profiles.daily_step_goal IS 'Daily step goal. NULL means no goal has been saved or imported yet; clients display 10000 until configured.';
CREATE OR REPLACE FUNCTION public.set_daily_step_goal(p_profile_id uuid, p_goal integer, p_import boolean DEFAULT false) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_goal integer; v_owner boolean;
BEGIN
 IF auth.uid() IS NULL OR p_goal IS NULL OR p_goal NOT BETWEEN 1000 AND 50000 OR p_import IS NULL THEN RAISE EXCEPTION 'Invalid step goal'; END IF;
 SELECT user_id = auth.uid() INTO v_owner FROM public.profiles WHERE id = p_profile_id AND role = 'child';
 IF NOT FOUND THEN RAISE EXCEPTION 'Child profile required'; END IF;
 IF NOT v_owner AND NOT EXISTS (SELECT 1 FROM public.parent_child_links l JOIN public.profiles p ON p.id=l.parent_id WHERE l.child_id=p_profile_id AND p.user_id=auth.uid()) THEN RAISE EXCEPTION 'Owner or linked parent required'; END IF;
 IF p_import AND NOT v_owner THEN RAISE EXCEPTION 'Only owner may import'; END IF;
 SELECT daily_step_goal INTO v_goal FROM public.profiles WHERE id=p_profile_id FOR UPDATE;
 IF NOT p_import OR v_goal IS NULL THEN
 UPDATE public.profiles SET daily_step_goal=p_goal WHERE id=p_profile_id RETURNING daily_step_goal INTO v_goal;
 END IF;
 RETURN v_goal;
END $$;
REVOKE ALL ON FUNCTION public.set_daily_step_goal(uuid,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_daily_step_goal(uuid,integer,boolean) TO authenticated;