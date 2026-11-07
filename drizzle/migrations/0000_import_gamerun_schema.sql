CREATE TYPE public.user_role AS ENUM ('parent', 'child');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.parent_child_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  distance_meters REAL NOT NULL DEFAULT 0,
  active_minutes INTEGER NOT NULL DEFAULT 0,
  screen_time_earned INTEGER NOT NULL DEFAULT 0,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, logged_at)
);
CREATE TABLE public.screen_time_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  minutes_remaining INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.screen_time_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_minutes integer NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);
CREATE TABLE public.downtime_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIME NOT NULL DEFAULT '21:00',
  end_time TIME NOT NULL DEFAULT '07:00',
  days_enabled TEXT[] NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);
CREATE TABLE public.app_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  app_icon TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  daily_limit_minutes INTEGER NOT NULL DEFAULT 60,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id, app_name)
);
CREATE TABLE public.always_allowed_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  app_icon TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id, app_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.parent_child_links, public.activity_logs, public.screen_time_balance, public.screen_time_requests, public.downtime_schedules, public.app_limits, public.always_allowed_apps TO authenticated;
GRANT ALL ON public.profiles, public.parent_child_links, public.activity_logs, public.screen_time_balance, public.screen_time_requests, public.downtime_schedules, public.app_limits, public.always_allowed_apps TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_time_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_time_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downtime_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.always_allowed_apps ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_parent_of_profile(profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM parent_child_links pcl JOIN profiles p ON pcl.parent_id = p.id
    WHERE p.user_id = auth.uid() AND pcl.child_id = profile_id);
$$;
CREATE OR REPLACE FUNCTION public.is_child_of_profile(profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM parent_child_links pcl JOIN profiles c ON pcl.child_id = c.id
    WHERE c.user_id = auth.uid() AND pcl.parent_id = profile_id);
$$;
CREATE OR REPLACE FUNCTION public.owns_profile(profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid());
$$;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Parents can view linked children profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_parent_of_profile(id));
CREATE POLICY "Children can view linked parent profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_child_of_profile(id));

CREATE POLICY "Parents can view their links" ON public.parent_child_links FOR SELECT TO authenticated USING (public.owns_profile(parent_id));
CREATE POLICY "Children can view their links" ON public.parent_child_links FOR SELECT TO authenticated USING (public.owns_profile(child_id));
CREATE POLICY "Parents can delete links" ON public.parent_child_links FOR DELETE TO authenticated USING (public.owns_profile(parent_id));

CREATE POLICY "Users can view own activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.owns_profile(user_id));
CREATE POLICY "Users can insert own activity" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.owns_profile(user_id));
CREATE POLICY "Users can update own activity" ON public.activity_logs FOR UPDATE TO authenticated USING (public.owns_profile(user_id));
CREATE POLICY "Parents can view linked children activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_parent_of_profile(user_id));

CREATE POLICY "Users can view own balance" ON public.screen_time_balance FOR SELECT TO authenticated USING (public.owns_profile(user_id));
CREATE POLICY "Users can update own balance" ON public.screen_time_balance FOR UPDATE TO authenticated USING (public.owns_profile(user_id));
CREATE POLICY "Users can insert own balance" ON public.screen_time_balance FOR INSERT TO authenticated WITH CHECK (public.owns_profile(user_id));
CREATE POLICY "Parents can view linked children balance" ON public.screen_time_balance FOR SELECT TO authenticated USING (public.is_parent_of_profile(user_id));
CREATE POLICY "Parents can update linked children balance" ON public.screen_time_balance FOR UPDATE TO authenticated USING (public.is_parent_of_profile(user_id));

CREATE POLICY "Children can view own requests" ON public.screen_time_requests FOR SELECT TO authenticated USING (public.owns_profile(child_id));
CREATE POLICY "Children can create own requests" ON public.screen_time_requests FOR INSERT TO authenticated WITH CHECK (public.owns_profile(child_id) AND public.is_child_of_profile(parent_id));
CREATE POLICY "Parents can view linked children requests" ON public.screen_time_requests FOR SELECT TO authenticated USING (public.owns_profile(parent_id));
CREATE POLICY "Parents can update linked children requests" ON public.screen_time_requests FOR UPDATE TO authenticated USING (public.owns_profile(parent_id));

CREATE POLICY "Parents can manage their children's downtime" ON public.downtime_schedules FOR ALL TO authenticated USING (public.owns_profile(parent_id)) WITH CHECK (public.owns_profile(parent_id) AND public.is_parent_of_profile(child_id));
CREATE POLICY "Parents can manage their children's app limits" ON public.app_limits FOR ALL TO authenticated USING (public.owns_profile(parent_id)) WITH CHECK (public.owns_profile(parent_id) AND public.is_parent_of_profile(child_id));
CREATE POLICY "Parents can manage their children's allowed apps" ON public.always_allowed_apps FOR ALL TO authenticated USING (public.owns_profile(parent_id)) WITH CHECK (public.owns_profile(parent_id) AND public.is_parent_of_profile(child_id));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.update_last_updated_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.last_updated = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_screen_time_balance_last_updated BEFORE UPDATE ON public.screen_time_balance FOR EACH ROW EXECUTE FUNCTION public.update_last_updated_column();
CREATE TRIGGER update_downtime_schedules_updated_at BEFORE UPDATE ON public.downtime_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_child_links;