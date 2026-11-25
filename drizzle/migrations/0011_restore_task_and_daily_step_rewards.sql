CREATE TABLE public.task_rounds (
 id uuid PRIMARY KEY, profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 subject text NOT NULL CHECK(subject IN ('matte','svenska','engelska')), level integer NOT NULL CHECK(level BETWEEN 1 AND 3),
 correct integer NOT NULL CHECK(correct BETWEEN 0 AND 5), total integer NOT NULL CHECK(total=5),
 started_at timestamptz NOT NULL, day date NOT NULL, earned_minutes integer NOT NULL CHECK(earned_minutes BETWEEN 0 AND 5), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.task_rounds TO authenticated;
GRANT ALL ON public.task_rounds TO service_role;
ALTER TABLE public.task_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own task rounds" ON public.task_rounds FOR SELECT TO authenticated USING(public.owns_profile(profile_id));
CREATE INDEX task_rounds_profile_day ON public.task_rounds(profile_id,day);
CREATE TABLE public.movement_day_credits (
 profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, day date NOT NULL,
 pass_steps integer NOT NULL DEFAULT 0 CHECK(pass_steps>=0), daily_steps integer NOT NULL DEFAULT 0 CHECK(daily_steps>=0),
 credited_minutes integer NOT NULL DEFAULT 0 CHECK(credited_minutes>=0), PRIMARY KEY(profile_id,day)
);
GRANT SELECT ON public.movement_day_credits TO authenticated;
GRANT ALL ON public.movement_day_credits TO service_role;
ALTER TABLE public.movement_day_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own movement credits" ON public.movement_day_credits FOR SELECT TO authenticated USING(public.owns_profile(profile_id));
INSERT INTO public.movement_day_credits(profile_id,day,pass_steps,credited_minutes)
 SELECT profile_id,(started_at AT TIME ZONE 'Europe/Stockholm')::date,sum(steps)::integer,sum(earned_minutes)::integer FROM public.completed_activity_passes GROUP BY profile_id,(started_at AT TIME ZONE 'Europe/Stockholm')::date;
CREATE OR REPLACE FUNCTION public.complete_task_round(p_id uuid,p_subject text,p_level integer,p_correct integer,p_total integer,p_started_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_profile uuid; v_existing public.task_rounds%ROWTYPE; v_today integer; v_earned integer; v_balance integer; v_day date := (now() AT TIME ZONE 'Europe/Stockholm')::date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id INTO v_profile FROM public.profiles WHERE user_id=auth.uid();
 IF v_profile IS NULL OR p_id IS NULL OR p_subject IS NULL OR p_subject NOT IN ('matte','svenska','engelska') OR p_level IS NULL OR p_level NOT BETWEEN 1 AND 3 OR p_correct IS NULL OR p_correct NOT BETWEEN 0 AND 5 OR p_total IS NULL OR p_total<>5 OR p_started_at IS NULL OR p_started_at>now()+interval '1 minute' THEN RAISE EXCEPTION 'Invalid task round'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_profile::text,0));
 SELECT * INTO v_existing FROM public.task_rounds WHERE id=p_id;
 IF FOUND THEN
  IF v_existing.profile_id<>v_profile OR v_existing.subject<>p_subject OR v_existing.level<>p_level OR v_existing.correct<>p_correct OR v_existing.total<>p_total OR v_existing.started_at<>p_started_at THEN RAISE EXCEPTION 'Task round mismatch'; END IF;
  v_earned:=v_existing.earned_minutes;
 ELSE
  SELECT COALESCE(sum(earned_minutes),0)::integer INTO v_today FROM public.task_rounds WHERE profile_id=v_profile AND day=v_day;
  v_earned:=greatest(0,least(p_correct,20-v_today));
  INSERT INTO public.task_rounds(id,profile_id,subject,level,correct,total,started_at,day,earned_minutes) VALUES(p_id,v_profile,p_subject,p_level,p_correct,p_total,p_started_at,v_day,v_earned);
  INSERT INTO public.screen_time_balance(user_id,minutes_remaining) VALUES(v_profile,v_earned) ON CONFLICT(user_id) DO UPDATE SET minutes_remaining=screen_time_balance.minutes_remaining+EXCLUDED.minutes_remaining;
 END IF;
 SELECT COALESCE(sum(earned_minutes),0)::integer INTO v_today FROM public.task_rounds WHERE profile_id=v_profile AND day=v_day;
 SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id=v_profile;
 RETURN jsonb_build_object('earned_minutes',v_earned,'today_minutes',v_today,'balance',COALESCE(v_balance,0));
END $$;
REVOKE ALL ON FUNCTION public.complete_task_round(uuid,text,integer,integer,integer,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_task_round(uuid,text,integer,integer,integer,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.claim_daily_steps(p_day date,p_steps integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_profile uuid; v_day date := (now() AT TIME ZONE 'Europe/Stockholm')::date; v_row public.movement_day_credits%ROWTYPE; v_earned integer; v_balance integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id INTO v_profile FROM public.profiles WHERE user_id=auth.uid();
 IF v_profile IS NULL OR p_day IS NULL OR p_day NOT BETWEEN v_day-1 AND v_day OR p_steps IS NULL OR p_steps NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Invalid daily steps'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_profile::text,0));
 INSERT INTO public.movement_day_credits(profile_id,day) VALUES(v_profile,p_day) ON CONFLICT DO NOTHING;
 UPDATE public.movement_day_credits SET daily_steps=greatest(daily_steps,p_steps) WHERE profile_id=v_profile AND day=p_day RETURNING * INTO v_row;
 v_earned:=greatest(0,greatest(v_row.daily_steps,v_row.pass_steps)/200-v_row.credited_minutes);
 UPDATE public.movement_day_credits SET credited_minutes=credited_minutes+v_earned WHERE profile_id=v_profile AND day=p_day RETURNING * INTO v_row;
 INSERT INTO public.screen_time_balance(user_id,minutes_remaining) VALUES(v_profile,v_earned) ON CONFLICT(user_id) DO UPDATE SET minutes_remaining=screen_time_balance.minutes_remaining+EXCLUDED.minutes_remaining RETURNING minutes_remaining INTO v_balance;
 RETURN jsonb_build_object('earned_minutes',v_earned,'day_minutes',v_row.credited_minutes,'balance',v_balance);
END $$;
REVOKE ALL ON FUNCTION public.claim_daily_steps(date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_steps(date,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.complete_step_pass(p_id uuid,p_started_at timestamptz,p_ended_at timestamptz,p_day date,p_steps integer,p_distance real,p_active_minutes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_profile uuid; v_earned integer; v_balance integer; v_existing public.completed_activity_passes%ROWTYPE; v_row public.movement_day_credits%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT id INTO v_profile FROM public.profiles WHERE user_id=auth.uid();
 IF v_profile IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
 IF p_id IS NULL OR p_started_at IS NULL OR p_ended_at IS NULL OR p_day IS NULL OR p_steps IS NULL OR p_distance IS NULL OR p_active_minutes IS NULL OR p_steps<0 OR p_steps>100000 OR p_distance<0 OR p_distance IN ('NaN'::real,'Infinity'::real) OR p_active_minutes<0 OR p_ended_at<p_started_at OR p_ended_at>now()+interval '1 minute' THEN RAISE EXCEPTION 'Invalid pass'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_profile::text,0));
 SELECT * INTO v_existing FROM public.completed_activity_passes WHERE id=p_id;
 IF FOUND THEN
  IF v_existing.profile_id<>v_profile THEN RAISE EXCEPTION 'Invalid pass owner'; END IF;
  SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id=v_profile;
  RETURN jsonb_build_object('earned_minutes',v_existing.earned_minutes,'balance',COALESCE(v_balance,0));
 END IF;
 IF EXISTS(SELECT 1 FROM public.completed_activity_passes WHERE profile_id=v_profile AND started_at<p_ended_at AND ended_at>p_started_at) THEN RAISE EXCEPTION 'Pass overlaps a completed pass'; END IF;
 INSERT INTO public.movement_day_credits(profile_id,day) VALUES(v_profile,p_day) ON CONFLICT DO NOTHING;
 UPDATE public.movement_day_credits SET pass_steps=pass_steps+p_steps WHERE profile_id=v_profile AND day=p_day RETURNING * INTO v_row;
 v_earned:=greatest(0,greatest(v_row.daily_steps,v_row.pass_steps)/200-v_row.credited_minutes);
 UPDATE public.movement_day_credits SET credited_minutes=credited_minutes+v_earned WHERE profile_id=v_profile AND day=p_day;
 INSERT INTO public.completed_activity_passes VALUES(p_id,v_profile,p_started_at,p_ended_at,p_steps,v_earned);
 INSERT INTO public.activity_logs(user_id,logged_at,steps,distance_meters,active_minutes,screen_time_earned) VALUES(v_profile,p_day,p_steps,p_distance,p_active_minutes,v_earned)
 ON CONFLICT(user_id,logged_at) DO UPDATE SET steps=activity_logs.steps+EXCLUDED.steps,distance_meters=activity_logs.distance_meters+EXCLUDED.distance_meters,active_minutes=activity_logs.active_minutes+EXCLUDED.active_minutes,screen_time_earned=activity_logs.screen_time_earned+EXCLUDED.screen_time_earned;
 INSERT INTO public.screen_time_balance(user_id,minutes_remaining) VALUES(v_profile,v_earned) ON CONFLICT(user_id) DO UPDATE SET minutes_remaining=screen_time_balance.minutes_remaining+EXCLUDED.minutes_remaining RETURNING minutes_remaining INTO v_balance;
 RETURN jsonb_build_object('earned_minutes',v_earned,'balance',v_balance);
END $$;
REVOKE ALL ON FUNCTION public.complete_step_pass(uuid,timestamptz,timestamptz,date,integer,real,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_step_pass(uuid,timestamptz,timestamptz,date,integer,real,integer) TO authenticated;
NOTIFY pgrst,'reload schema';