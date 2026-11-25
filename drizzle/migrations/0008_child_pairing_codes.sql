CREATE TABLE public.child_pairing_codes (child_id uuid PRIMARY KEY REFERENCES public.profiles(id), code_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, consumed_at timestamptz);
GRANT ALL ON public.child_pairing_codes TO service_role;
ALTER TABLE public.child_pairing_codes ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.create_child_pairing_code() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_child uuid; v_code text; v_hash text; v_bytes bytea; v_number bigint; v_expiry timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id INTO v_child FROM public.profiles WHERE user_id=auth.uid() AND role='child';
 IF v_child IS NULL THEN RAISE EXCEPTION 'Child account required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_child::text,17));
 LOOP
  v_bytes := extensions.gen_random_bytes(4);
  v_number := get_byte(v_bytes,0)::bigint*16777216+get_byte(v_bytes,1)::bigint*65536+get_byte(v_bytes,2)::bigint*256+get_byte(v_bytes,3);
  IF v_number >= 4294000000 THEN CONTINUE; END IF;
  v_code := lpad((v_number % 1000000)::text,6,'0');
  v_hash := encode(extensions.digest(v_code,'sha256'),'hex');
  IF EXISTS(SELECT 1 FROM public.child_pairing_codes WHERE code_hash=v_hash) THEN CONTINUE; END IF;
  v_expiry := clock_timestamp()+interval '10 minutes';
  BEGIN
   INSERT INTO public.child_pairing_codes(child_id,code_hash,expires_at) VALUES(v_child,v_hash,v_expiry)
   ON CONFLICT(child_id) DO UPDATE SET code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,consumed_at=NULL;
   EXIT;
  EXCEPTION WHEN unique_violation THEN CONTINUE;
  END;
 END LOOP;
 RETURN jsonb_build_object('code',v_code,'expiresAt',v_expiry);
END $$;
REVOKE ALL ON FUNCTION public.create_child_pairing_code() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_child_pairing_code() TO authenticated;