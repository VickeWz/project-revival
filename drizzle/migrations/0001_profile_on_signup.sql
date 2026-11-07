CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.user_role;
  _pid uuid;
BEGIN
  _role := CASE WHEN NEW.raw_user_meta_data->>'role' = 'child' THEN 'child'::public.user_role
                WHEN NEW.raw_user_meta_data->>'role' = 'parent' THEN 'parent'::public.user_role
                ELSE NULL END;
  IF _role IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.profiles (user_id, display_name, role)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(NEW.email, '@', 1)), _role)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO _pid;
  IF _role = 'child' AND _pid IS NOT NULL THEN
    INSERT INTO public.screen_time_balance (user_id, minutes_remaining) VALUES (_pid, 0) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();