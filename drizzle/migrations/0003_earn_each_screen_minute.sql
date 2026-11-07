CREATE OR REPLACE FUNCTION public.complete_step_pass(p_id uuid, p_started_at timestamp with time zone, p_ended_at timestamp with time zone, p_day date, p_steps integer, p_distance real, p_active_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_profile uuid; v_earned integer; v_balance integer; v_existing public.completed_activity_passes%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT id INTO v_profile FROM public.profiles WHERE user_id = auth.uid();
 IF v_profile IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
 IF p_id IS NULL OR p_started_at IS NULL OR p_ended_at IS NULL OR p_day IS NULL OR p_steps IS NULL OR p_distance IS NULL OR p_active_minutes IS NULL OR p_steps < 0 OR p_distance < 0 OR p_distance = 'NaN'::real OR p_active_minutes < 0 OR p_ended_at < p_started_at OR p_ended_at > now() + interval '1 minute' THEN RAISE EXCEPTION 'Invalid pass'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_profile::text, 0));
 SELECT * INTO v_existing FROM public.completed_activity_passes WHERE id = p_id;
 IF FOUND THEN
  IF v_existing.profile_id <> v_profile THEN RAISE EXCEPTION 'Invalid pass owner'; END IF;
  SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id = v_profile;
  RETURN jsonb_build_object('earned_minutes', v_existing.earned_minutes, 'balance', COALESCE(v_balance, 0));
 END IF;
 IF EXISTS (SELECT 1 FROM public.completed_activity_passes WHERE profile_id = v_profile AND started_at < p_ended_at AND ended_at > p_started_at) THEN RAISE EXCEPTION 'Pass overlaps a completed pass'; END IF;
 v_earned := p_steps / 200;
 INSERT INTO public.completed_activity_passes VALUES (p_id, v_profile, p_started_at, p_ended_at, p_steps, v_earned);
 INSERT INTO public.activity_logs (user_id, logged_at, steps, distance_meters, active_minutes, screen_time_earned)
 VALUES (v_profile, p_day, p_steps, p_distance, p_active_minutes, v_earned)
 ON CONFLICT (user_id, logged_at) DO UPDATE SET steps = activity_logs.steps + EXCLUDED.steps, distance_meters = activity_logs.distance_meters + EXCLUDED.distance_meters, active_minutes = activity_logs.active_minutes + EXCLUDED.active_minutes, screen_time_earned = activity_logs.screen_time_earned + EXCLUDED.screen_time_earned;
 INSERT INTO public.screen_time_balance (user_id, minutes_remaining) VALUES (v_profile, v_earned)
 ON CONFLICT (user_id) DO UPDATE SET minutes_remaining = screen_time_balance.minutes_remaining + EXCLUDED.minutes_remaining
 RETURNING minutes_remaining INTO v_balance;
 RETURN jsonb_build_object('earned_minutes', v_earned, 'balance', v_balance);
END;
$function$;
REVOKE ALL ON FUNCTION public.complete_step_pass(uuid,timestamptz,timestamptz,date,integer,real,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_step_pass(uuid,timestamptz,timestamptz,date,integer,real,integer) TO authenticated;