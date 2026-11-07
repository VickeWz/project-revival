CREATE TABLE public.screen_time_sessions (
 id uuid PRIMARY KEY,
 profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 device_id uuid NOT NULL,
 minutes integer NOT NULL CHECK (minutes BETWEEN 1 AND 180),
 started_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 balance_after integer NOT NULL
);
GRANT SELECT ON public.screen_time_sessions TO authenticated;
GRANT ALL ON public.screen_time_sessions TO service_role;
ALTER TABLE public.screen_time_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own screen time sessions" ON public.screen_time_sessions FOR SELECT TO authenticated USING (public.owns_profile(profile_id));
CREATE INDEX screen_time_sessions_profile_expiry ON public.screen_time_sessions(profile_id, expires_at);
DROP POLICY IF EXISTS "Users can update own balance" ON public.screen_time_balance;
DROP POLICY IF EXISTS "Users can insert own balance" ON public.screen_time_balance;
CREATE OR REPLACE FUNCTION public.redeem_screen_time(p_id uuid, p_device_id uuid, p_minutes integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile uuid; v_balance integer; v_session public.screen_time_sessions%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id INTO v_profile FROM public.profiles WHERE user_id = auth.uid();
 IF v_profile IS NULL OR p_id IS NULL OR p_device_id IS NULL OR p_minutes IS NULL OR p_minutes < 1 OR p_minutes > 180 THEN RAISE EXCEPTION 'Invalid activation'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_profile::text, 1));
 SELECT * INTO v_session FROM public.screen_time_sessions WHERE id = p_id;
 IF FOUND THEN
  IF v_session.profile_id <> v_profile OR v_session.device_id <> p_device_id OR v_session.minutes <> p_minutes THEN RAISE EXCEPTION 'Session mismatch'; END IF;
  RETURN to_jsonb(v_session);
 END IF;
 IF EXISTS(SELECT 1 FROM public.screen_time_sessions WHERE profile_id = v_profile AND expires_at > now()) THEN RAISE EXCEPTION 'Session already active'; END IF;
 SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id = v_profile FOR UPDATE;
 IF v_balance IS NULL OR v_balance < p_minutes THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
 UPDATE public.screen_time_balance SET minutes_remaining = minutes_remaining - p_minutes, last_updated = now() WHERE user_id = v_profile RETURNING minutes_remaining INTO v_balance;
 INSERT INTO public.screen_time_sessions(id,profile_id,device_id,minutes,expires_at,balance_after) VALUES(p_id,v_profile,p_device_id,p_minutes,now() + make_interval(mins => p_minutes),v_balance) RETURNING * INTO v_session;
 RETURN to_jsonb(v_session);
END $$;
REVOKE ALL ON FUNCTION public.redeem_screen_time(uuid,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_screen_time(uuid,uuid,integer) TO authenticated;
