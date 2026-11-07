-- Allow children to view their own parent-child links
CREATE POLICY "Children can view their links"
ON public.parent_child_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = parent_child_links.child_id
    AND profiles.user_id = auth.uid()
  )
);

-- Allow children to view their linked parent's profile (display_name, etc.)
CREATE OR REPLACE FUNCTION public.is_child_of_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_child_links pcl
    JOIN profiles child_profile ON pcl.child_id = child_profile.id
    WHERE child_profile.user_id = auth.uid() AND pcl.parent_id = profile_id
  );
$$;

CREATE POLICY "Children can view linked parent profiles"
ON public.profiles
FOR SELECT
USING (is_child_of_profile(id));