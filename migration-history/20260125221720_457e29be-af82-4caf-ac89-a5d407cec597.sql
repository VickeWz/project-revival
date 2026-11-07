-- Create screen time requests table
CREATE TABLE public.screen_time_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_minutes integer NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.screen_time_requests ENABLE ROW LEVEL SECURITY;

-- Children can view and create their own requests
CREATE POLICY "Children can view own requests"
ON public.screen_time_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = screen_time_requests.child_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Children can create own requests"
ON public.screen_time_requests FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = screen_time_requests.child_id
  AND profiles.user_id = auth.uid()
));

-- Parents can view requests from their linked children
CREATE POLICY "Parents can view linked children requests"
ON public.screen_time_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = screen_time_requests.parent_id
  AND profiles.user_id = auth.uid()
));

-- Parents can update (accept/decline) requests
CREATE POLICY "Parents can update linked children requests"
ON public.screen_time_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = screen_time_requests.parent_id
  AND profiles.user_id = auth.uid()
));