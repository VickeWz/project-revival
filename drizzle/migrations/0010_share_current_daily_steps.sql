CREATE TABLE public.current_daily_steps (child_id uuid PRIMARY KEY REFERENCES public.profiles(id), day date NOT NULL, steps integer NOT NULL CHECK(steps BETWEEN 0 AND 1000000));
GRANT SELECT,INSERT,UPDATE ON public.current_daily_steps TO authenticated;
GRANT ALL ON public.current_daily_steps TO service_role;
ALTER TABLE public.current_daily_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Child and linked parents read daily total" ON public.current_daily_steps FOR SELECT TO authenticated USING(public.owns_profile(child_id) OR public.is_parent_of_profile(child_id));
CREATE POLICY "Child inserts own daily total" ON public.current_daily_steps FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=child_id AND user_id=auth.uid() AND role='child'));
CREATE POLICY "Child updates own daily total" ON public.current_daily_steps FOR UPDATE TO authenticated USING(public.owns_profile(child_id)) WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=child_id AND user_id=auth.uid() AND role='child'));
COMMENT ON TABLE public.current_daily_steps IS 'Latest local-calendar daily HealthKit step total only; overwritten each day, never used for rewards.';