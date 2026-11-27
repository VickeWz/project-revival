-- 1. Förälderns val per barn
CREATE TABLE public.daily_screen_time_settings (
  child_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  minutes integer NOT NULL DEFAULT 0 CHECK (minutes IN (0, 60, 120, 180)),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_screen_time_settings TO authenticated;
GRANT ALL ON public.daily_screen_time_settings TO service_role;
ALTER TABLE public.daily_screen_time_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or linked child daily screen time" ON public.daily_screen_time_settings FOR SELECT TO authenticated
  USING (public.owns_profile(child_id) OR public.is_parent_of_profile(child_id));

-- 2. Vad varje dag faktiskt gav (en rad per barn och svensk dag)
CREATE TABLE public.daily_screen_time_credits (
  child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  minutes integer NOT NULL CHECK (minutes BETWEEN 0 AND 180),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expired_minutes integer NOT NULL DEFAULT 0 CHECK (expired_minutes >= 0),
  PRIMARY KEY (child_id, day)
);
GRANT SELECT ON public.daily_screen_time_credits TO authenticated;
GRANT ALL ON public.daily_screen_time_credits TO service_role;
ALTER TABLE public.daily_screen_time_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or linked child daily screen time credits" ON public.daily_screen_time_credits FOR SELECT TO authenticated
  USING (public.owns_profile(child_id) OR public.is_parent_of_profile(child_id));

-- 3. Ger dagens grundtid en gång och tar bort förra dagens oanvända grundtid (bara internt)
CREATE OR REPLACE FUNCTION public.settle_daily_screen_time(p_child uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 v_today date := (now() AT TIME ZONE 'Europe/Stockholm')::date;
 v_row public.daily_screen_time_credits%ROWTYPE;
 v_last public.daily_screen_time_credits%ROWTYPE;
 v_minutes integer; v_used integer; v_balance integer; v_expired integer := 0; v_granted integer := 0;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_child::text, 0));
 SELECT * INTO v_row FROM public.daily_screen_time_credits WHERE child_id = p_child AND day = v_today;
 IF NOT FOUND THEN
  SELECT * INTO v_last FROM public.daily_screen_time_credits WHERE child_id = p_child AND day < v_today ORDER BY day DESC LIMIT 1;
  IF FOUND AND v_last.minutes > 0 THEN
   -- Grundtiden används först: allt som låstes upp den dagen efter att den gavs räknas mot den.
   SELECT COALESCE(SUM(minutes), 0) INTO v_used FROM public.screen_time_sessions
    WHERE profile_id = p_child AND started_at >= v_last.granted_at
      AND started_at < ((v_last.day + 1)::timestamp AT TIME ZONE 'Europe/Stockholm');
   SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id = p_child FOR UPDATE;
   v_expired := LEAST(GREATEST(0, v_last.minutes - v_used), GREATEST(0, COALESCE(v_balance, 0)));
   IF v_expired > 0 THEN
    UPDATE public.screen_time_balance SET minutes_remaining = minutes_remaining - v_expired, last_updated = now() WHERE user_id = p_child;
   END IF;
   UPDATE public.daily_screen_time_credits SET expired_minutes = v_expired WHERE child_id = p_child AND day = v_last.day;
  END IF;
  v_minutes := COALESCE((SELECT minutes FROM public.daily_screen_time_settings WHERE child_id = p_child), 0);
  INSERT INTO public.daily_screen_time_credits (child_id, day, minutes) VALUES (p_child, v_today, v_minutes) RETURNING * INTO v_row;
  IF v_minutes > 0 THEN
   INSERT INTO public.screen_time_balance (user_id, minutes_remaining) VALUES (p_child, v_minutes)
   ON CONFLICT (user_id) DO UPDATE SET minutes_remaining = screen_time_balance.minutes_remaining + EXCLUDED.minutes_remaining, last_updated = now();
   v_granted := v_minutes;
  END IF;
 END IF;
 SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id = p_child;
 RETURN jsonb_build_object('day', v_today, 'day_minutes', v_row.minutes, 'granted_minutes', v_granted, 'expired_minutes', v_expired, 'balance', COALESCE(v_balance, 0));
END $$;
REVOKE ALL ON FUNCTION public.settle_daily_screen_time(uuid) FROM PUBLIC, anon, authenticated;

-- 4. Barnet själv eller en kopplad förälder hämtar dagens grundtid
CREATE OR REPLACE FUNCTION public.claim_daily_screen_time(p_child_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_child_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_child_id AND role = 'child')
    OR NOT (public.owns_profile(p_child_id) OR public.is_parent_of_profile(p_child_id)) THEN
  RAISE EXCEPTION 'Not allowed';
 END IF;
 RETURN public.settle_daily_screen_time(p_child_id);
END $$;
REVOKE ALL ON FUNCTION public.claim_daily_screen_time(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_screen_time(uuid) TO authenticated;

-- 5. Föräldern väljer nivå; dagens redan givna grundtid justeras direkt
CREATE OR REPLACE FUNCTION public.set_daily_screen_time(p_child_id uuid, p_minutes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 v_parent uuid;
 v_today date := (now() AT TIME ZONE 'Europe/Stockholm')::date;
 v_row public.daily_screen_time_credits%ROWTYPE;
 v_used integer; v_balance integer; v_change integer := 0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT id INTO v_parent FROM public.profiles WHERE user_id = auth.uid() AND role = 'parent';
 IF v_parent IS NULL OR p_child_id IS NULL OR NOT public.is_parent_of_profile(p_child_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF p_minutes IS NULL OR p_minutes NOT IN (0, 60, 120, 180) THEN RAISE EXCEPTION 'Invalid daily screen time'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_child_id::text, 0));
 INSERT INTO public.daily_screen_time_settings (child_id, minutes, updated_by, updated_at) VALUES (p_child_id, p_minutes, v_parent, now())
 ON CONFLICT (child_id) DO UPDATE SET minutes = EXCLUDED.minutes, updated_by = EXCLUDED.updated_by, updated_at = now();
 SELECT * INTO v_row FROM public.daily_screen_time_credits WHERE child_id = p_child_id AND day = v_today FOR UPDATE;
 IF FOUND AND v_row.minutes <> p_minutes THEN
  SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id = p_child_id FOR UPDATE;
  IF p_minutes > v_row.minutes THEN
   v_change := p_minutes - v_row.minutes;
  ELSE
   SELECT COALESCE(SUM(minutes), 0) INTO v_used FROM public.screen_time_sessions
    WHERE profile_id = p_child_id AND started_at >= v_row.granted_at;
   v_change := -LEAST(v_row.minutes - p_minutes, GREATEST(0, v_row.minutes - v_used), GREATEST(0, COALESCE(v_balance, 0)));
  END IF;
  IF v_change <> 0 THEN
   INSERT INTO public.screen_time_balance (user_id, minutes_remaining) VALUES (p_child_id, GREATEST(0, v_change))
   ON CONFLICT (user_id) DO UPDATE SET minutes_remaining = screen_time_balance.minutes_remaining + v_change, last_updated = now();
   -- Dagens rad visar hur mycket grundtid som faktiskt getts netto i dag.
   UPDATE public.daily_screen_time_credits SET minutes = v_row.minutes + v_change WHERE child_id = p_child_id AND day = v_today;
  END IF;
 END IF;
 SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id = p_child_id;
 RETURN jsonb_build_object('minutes', p_minutes, 'today_change', v_change, 'balance', COALESCE(v_balance, 0));
END $$;
REVOKE ALL ON FUNCTION public.set_daily_screen_time(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_daily_screen_time(uuid, integer) TO authenticated;