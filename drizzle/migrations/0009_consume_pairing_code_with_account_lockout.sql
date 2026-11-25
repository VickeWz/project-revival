CREATE TABLE public.parent_pairing_attempts (parent_id uuid PRIMARY KEY REFERENCES public.profiles(id), failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 5), blocked_until timestamptz);
GRANT ALL ON public.parent_pairing_attempts TO service_role;
ALTER TABLE public.parent_pairing_attempts ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.consume_child_pairing_code(p_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_parent uuid; v_attempt public.parent_pairing_attempts%ROWTYPE; v_code public.child_pairing_codes%ROWTYPE; v_now timestamptz; v_name text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id INTO v_parent FROM public.profiles WHERE user_id=auth.uid() AND role='parent';
 IF v_parent IS NULL THEN RAISE EXCEPTION 'Parent account required'; END IF;
 INSERT INTO public.parent_pairing_attempts(parent_id) VALUES(v_parent) ON CONFLICT DO NOTHING;
 SELECT * INTO v_attempt FROM public.parent_pairing_attempts WHERE parent_id=v_parent FOR UPDATE;
 v_now := clock_timestamp();
 IF v_attempt.blocked_until > v_now THEN RETURN jsonb_build_object('status','blocked','blockedUntil',v_attempt.blocked_until); END IF;
 IF v_attempt.blocked_until IS NOT NULL THEN v_attempt.failed_attempts:=0; END IF;
 IF p_code ~ '^[0-9]{6}$' THEN
  SELECT * INTO v_code FROM public.child_pairing_codes WHERE code_hash=encode(extensions.digest(p_code,'sha256'),'hex') FOR UPDATE;
 END IF;
 v_now := clock_timestamp();
 IF v_code.child_id IS NOT NULL AND v_code.consumed_at IS NULL AND v_code.expires_at > v_now THEN
  UPDATE public.child_pairing_codes SET consumed_at=v_now WHERE child_id=v_code.child_id;
  IF NOT EXISTS(SELECT 1 FROM public.parent_child_links WHERE parent_id=v_parent AND child_id=v_code.child_id) THEN
   INSERT INTO public.parent_child_links(parent_id,child_id) VALUES(v_parent,v_code.child_id);
  END IF;
  UPDATE public.parent_pairing_attempts SET failed_attempts=0,blocked_until=NULL WHERE parent_id=v_parent;
  SELECT display_name INTO v_name FROM public.profiles WHERE id=v_code.child_id;
  RETURN jsonb_build_object('status','linked','childName',v_name);
 END IF;
 v_attempt.failed_attempts:=v_attempt.failed_attempts+1;
 UPDATE public.parent_pairing_attempts SET failed_attempts=v_attempt.failed_attempts,blocked_until=CASE WHEN v_attempt.failed_attempts>=5 THEN v_now+interval '15 minutes' ELSE NULL END WHERE parent_id=v_parent RETURNING * INTO v_attempt;
 IF v_attempt.blocked_until IS NOT NULL THEN RETURN jsonb_build_object('status','blocked','blockedUntil',v_attempt.blocked_until); END IF;
 RETURN jsonb_build_object('status','invalid','attemptsRemaining',5-v_attempt.failed_attempts);
END $$;
REVOKE ALL ON FUNCTION public.consume_child_pairing_code(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_child_pairing_code(text) TO authenticated;