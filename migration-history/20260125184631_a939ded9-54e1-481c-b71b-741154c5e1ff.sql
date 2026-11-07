-- Create role enum for user types
CREATE TYPE public.user_role AS ENUM ('parent', 'child');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create parent-child relationships table
CREATE TABLE public.parent_child_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- Create activity logs table for tracking steps/distance
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  distance_meters REAL NOT NULL DEFAULT 0,
  active_minutes INTEGER NOT NULL DEFAULT 0,
  screen_time_earned INTEGER NOT NULL DEFAULT 0,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, logged_at)
);

-- Create screen time balance table
CREATE TABLE public.screen_time_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  minutes_remaining INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_time_balance ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Parents can view their children's profiles
CREATE POLICY "Parents can view linked children profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      JOIN public.profiles parent_profile ON pcl.parent_id = parent_profile.id
      WHERE parent_profile.user_id = auth.uid()
      AND pcl.child_id = profiles.id
    )
  );

-- Parent-child links policies
CREATE POLICY "Parents can view their links"
  ON public.parent_child_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = parent_child_links.parent_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can create links"
  ON public.parent_child_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = parent_child_links.parent_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'parent'
    )
  );

CREATE POLICY "Parents can delete links"
  ON public.parent_child_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = parent_child_links.parent_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Activity logs policies
CREATE POLICY "Users can view own activity"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = activity_logs.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own activity"
  ON public.activity_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = activity_logs.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own activity"
  ON public.activity_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = activity_logs.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view linked children activity"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      JOIN public.profiles parent_profile ON pcl.parent_id = parent_profile.id
      WHERE parent_profile.user_id = auth.uid()
      AND pcl.child_id = activity_logs.user_id
    )
  );

-- Screen time balance policies
CREATE POLICY "Users can view own balance"
  ON public.screen_time_balance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = screen_time_balance.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own balance"
  ON public.screen_time_balance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = screen_time_balance.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own balance"
  ON public.screen_time_balance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = screen_time_balance.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view linked children balance"
  ON public.screen_time_balance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      JOIN public.profiles parent_profile ON pcl.parent_id = parent_profile.id
      WHERE parent_profile.user_id = auth.uid()
      AND pcl.child_id = screen_time_balance.user_id
    )
  );

CREATE POLICY "Parents can update linked children balance"
  ON public.screen_time_balance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      JOIN public.profiles parent_profile ON pcl.parent_id = parent_profile.id
      WHERE parent_profile.user_id = auth.uid()
      AND pcl.child_id = screen_time_balance.user_id
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for screen time balance
CREATE TRIGGER update_screen_time_balance_last_updated
  BEFORE UPDATE ON public.screen_time_balance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();