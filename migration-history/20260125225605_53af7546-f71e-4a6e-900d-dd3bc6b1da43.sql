-- Create table for downtime schedules
CREATE TABLE public.downtime_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIME NOT NULL DEFAULT '21:00',
  end_time TIME NOT NULL DEFAULT '07:00',
  days_enabled TEXT[] NOT NULL DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- Create table for app limits
CREATE TABLE public.app_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  app_icon TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  daily_limit_minutes INTEGER NOT NULL DEFAULT 60,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id, app_name)
);

-- Create table for always allowed apps
CREATE TABLE public.always_allowed_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  app_icon TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id, app_name)
);

-- Enable RLS
ALTER TABLE public.downtime_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.always_allowed_apps ENABLE ROW LEVEL SECURITY;

-- RLS policies for downtime_schedules
CREATE POLICY "Parents can manage their children's downtime"
ON public.downtime_schedules FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = downtime_schedules.parent_id AND profiles.user_id = auth.uid()
));

-- RLS policies for app_limits
CREATE POLICY "Parents can manage their children's app limits"
ON public.app_limits FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = app_limits.parent_id AND profiles.user_id = auth.uid()
));

-- RLS policies for always_allowed_apps
CREATE POLICY "Parents can manage their children's allowed apps"
ON public.always_allowed_apps FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = always_allowed_apps.parent_id AND profiles.user_id = auth.uid()
));

-- Add trigger for updated_at on downtime_schedules
CREATE TRIGGER update_downtime_schedules_updated_at
BEFORE UPDATE ON public.downtime_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();