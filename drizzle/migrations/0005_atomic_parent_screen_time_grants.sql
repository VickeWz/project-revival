CREATE TABLE public.screen_time_grants (id uuid PRIMARY KEY, parent_id uuid NOT NULL REFERENCES public.profiles(id), child_id uuid NOT NULL REFERENCES public.profiles(id), minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 180), request_id uuid UNIQUE REFERENCES public.screen_time_requests(id), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.screen_time_grants TO authenticated;
GRANT ALL ON public.screen_time_grants TO service_role;
ALTER TABLE public.screen_time_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own grants" ON public.screen_time_grants FOR SELECT TO authenticated USING(public.owns_profile(parent_id));
DROP POLICY IF EXISTS "Parents can update linked children balance" ON public.screen_time_balance;
CREATE OR REPLACE FUNCTION public.grant_screen_time(p_id uuid,p_child_id uuid,p_minutes integer,p_request_id uuid DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_parent uuid; v_grant public.screen_time_grants%ROWTYPE; v_request public.screen_time_requests%ROWTYPE; v_balance integer;
BEGIN
 IF auth.uid() IS NULL OR p_id IS NULL OR p_child_id IS NULL OR p_minutes IS NULL OR p_minutes < 1 OR p_minutes > 180 THEN RAISE EXCEPTION 'Invalid grant'; END IF;
 SELECT id INTO v_parent FROM public.profiles WHERE user_id=auth.uid();
 IF NOT EXISTS(SELECT 1 FROM public.parent_child_links WHERE parent_id=v_parent AND child_id=p_child_id) THEN RAISE EXCEPTION 'Linked parent required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_child_id::text,0));
 SELECT * INTO v_grant FROM public.screen_time_grants WHERE id=p_id;
 IF FOUND THEN
  IF v_grant.parent_id<>v_parent OR v_grant.child_id<>p_child_id OR v_grant.minutes<>p_minutes OR v_grant.request_id IS DISTINCT FROM p_request_id THEN RAISE EXCEPTION 'Grant mismatch'; END IF;
  SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id=p_child_id; RETURN v_balance;
 END IF;
 IF p_request_id IS NOT NULL THEN
  SELECT * INTO v_request FROM public.screen_time_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.parent_id<>v_parent OR v_request.child_id<>p_child_id OR v_request.status<>'pending' THEN RAISE EXCEPTION 'Invalid request'; END IF;
  UPDATE public.screen_time_requests SET status='accepted',responded_at=now() WHERE id=p_request_id;
 END IF;
 INSERT INTO public.screen_time_grants VALUES(p_id,v_parent,p_child_id,p_minutes,p_request_id,now());
 INSERT INTO public.screen_time_balance(user_id,minutes_remaining) VALUES(p_child_id,p_minutes) ON CONFLICT(user_id) DO UPDATE SET minutes_remaining=screen_time_balance.minutes_remaining+EXCLUDED.minutes_remaining,last_updated=now() RETURNING minutes_remaining INTO v_balance;
 RETURN v_balance;
END $$;
REVOKE ALL ON FUNCTION public.grant_screen_time(uuid,uuid,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grant_screen_time(uuid,uuid,integer,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.redeem_screen_time(p_id uuid, p_device_id uuid, p_minutes integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile uuid; v_balance integer; v_session public.screen_time_sessions%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id INTO v_profile FROM public.profiles WHERE user_id=auth.uid();
 IF v_profile IS NULL OR p_id IS NULL OR p_device_id IS NULL OR p_minutes IS NULL OR p_minutes<1 OR p_minutes>180 THEN RAISE EXCEPTION 'Invalid activation'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_profile::text,0));
 SELECT * INTO v_session FROM public.screen_time_sessions WHERE id=p_id;
 IF FOUND THEN
  IF v_session.profile_id<>v_profile OR v_session.device_id<>p_device_id OR v_session.minutes<>p_minutes THEN RAISE EXCEPTION 'Session mismatch'; END IF;
  RETURN to_jsonb(v_session);
 END IF;
 IF EXISTS(SELECT 1 FROM public.screen_time_sessions WHERE profile_id=v_profile AND expires_at>now()) THEN RAISE EXCEPTION 'Session already active'; END IF;
 SELECT minutes_remaining INTO v_balance FROM public.screen_time_balance WHERE user_id=v_profile FOR UPDATE;
 IF v_balance IS NULL OR v_balance<p_minutes THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
 UPDATE public.screen_time_balance SET minutes_remaining=minutes_remaining-p_minutes,last_updated=now() WHERE user_id=v_profile RETURNING minutes_remaining INTO v_balance;
 INSERT INTO public.screen_time_sessions(id,profile_id,device_id,minutes,expires_at,balance_after) VALUES(p_id,v_profile,p_device_id,p_minutes,now()+make_interval(mins=>p_minutes),v_balance) RETURNING * INTO v_session;
 RETURN to_jsonb(v_session);
END $$;
REVOKE ALL ON FUNCTION public.redeem_screen_time(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.redeem_screen_time(uuid,uuid,integer) TO authenticated;