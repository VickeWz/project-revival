CREATE TABLE public.device_change_codes (
  child_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
GRANT ALL ON public.device_change_codes TO service_role;
ALTER TABLE public.device_change_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.device_change_attempts (
  child_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  blocked_until timestamptz
);
GRANT ALL ON public.device_change_attempts TO service_role;
ALTER TABLE public.device_change_attempts ENABLE ROW LEVEL SECURITY;

-- Förälder: en kod per barn som gäller i 5 minuter och bara en gång. En ny kod ersätter den förra.
CREATE OR REPLACE FUNCTION public.create_device_change_code(p_child_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_parent uuid; v_code text; v_bytes bytea; v_number bigint; v_expiry timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id INTO v_parent FROM public.profiles WHERE user_id = auth.uid() AND role = 'parent';
 IF v_parent IS NULL THEN RAISE EXCEPTION 'Parent account required'; END IF;
 IF p_child_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.parent_child_links WHERE parent_id = v_parent AND child_id = p_child_id) THEN
  RAISE EXCEPTION 'Child not linked';
 END IF;
 LOOP
  v_bytes := extensions.gen_random_bytes(4);
  v_number := get_byte(v_bytes,0)::bigint*16777216 + get_byte(v_bytes,1)::bigint*65536 + get_byte(v_bytes,2)::bigint*256 + get_byte(v_bytes,3);
  EXIT WHEN v_number < 4294000000;
 END LOOP;
 v_code := lpad((v_number % 1000000)::text, 6, '0');
 v_expiry := clock_timestamp() + interval '5 minutes';
 INSERT INTO public.device_change_codes (child_id, code_hash, created_by, expires_at)
 VALUES (p_child_id, encode(extensions.digest(v_code, 'sha256'), 'hex'), v_parent, v_expiry)
 ON CONFLICT (child_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, created_by = EXCLUDED.created_by, expires_at = EXCLUDED.expires_at, consumed_at = NULL;
 RETURN jsonb_build_object('code', v_code, 'expiresAt', v_expiry);
END $$;
REVOKE ALL ON FUNCTION public.create_device_change_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_device_change_code(uuid) TO authenticated;

-- Barn: löser in koden. Fel räknas per barnkonto och ger 15 minuters spärr efter 5 fel. Fel returneras, kastas inte.
CREATE OR REPLACE FUNCTION public.consume_device_change_code(p_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_child uuid; v_attempt public.device_change_attempts%ROWTYPE; v_row public.device_change_codes%ROWTYPE; v_now timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id INTO v_child FROM public.profiles WHERE user_id = auth.uid() AND role = 'child';
 IF v_child IS NULL THEN RAISE EXCEPTION 'Child account required'; END IF;
 INSERT INTO public.device_change_attempts (child_id) VALUES (v_child) ON CONFLICT DO NOTHING;
 SELECT * INTO v_attempt FROM public.device_change_attempts WHERE child_id = v_child FOR UPDATE;
 v_now := clock_timestamp();
 IF v_attempt.blocked_until > v_now THEN
  RETURN jsonb_build_object('status', 'blocked', 'blockedUntil', v_attempt.blocked_until);
 END IF;
 IF v_attempt.blocked_until IS NOT NULL THEN v_attempt.failed_attempts := 0; END IF;
 SELECT * INTO v_row FROM public.device_change_codes WHERE child_id = v_child FOR UPDATE;
 IF p_code ~ '^[0-9]{6}$' AND v_row.child_id IS NOT NULL AND v_row.consumed_at IS NULL AND v_row.expires_at > v_now
    AND v_row.code_hash = encode(extensions.digest(p_code, 'sha256'), 'hex')
    AND EXISTS (SELECT 1 FROM public.parent_child_links WHERE parent_id = v_row.created_by AND child_id = v_child) THEN
  UPDATE public.device_change_codes SET consumed_at = v_now WHERE child_id = v_child;
  UPDATE public.device_change_attempts SET failed_attempts = 0, blocked_until = NULL WHERE child_id = v_child;
  RETURN jsonb_build_object('status', 'ok');
 END IF;
 v_attempt.failed_attempts := v_attempt.failed_attempts + 1;
 UPDATE public.device_change_attempts
   SET failed_attempts = v_attempt.failed_attempts,
       blocked_until = CASE WHEN v_attempt.failed_attempts >= 5 THEN v_now + interval '15 minutes' ELSE NULL END
 WHERE child_id = v_child RETURNING * INTO v_attempt;
 IF v_attempt.blocked_until IS NOT NULL THEN
  RETURN jsonb_build_object('status', 'blocked', 'blockedUntil', v_attempt.blocked_until);
 END IF;
 RETURN jsonb_build_object('status', 'invalid', 'attemptsRemaining', 5 - v_attempt.failed_attempts);
END $$;
REVOKE ALL ON FUNCTION public.consume_device_change_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_device_change_code(text) TO authenticated;