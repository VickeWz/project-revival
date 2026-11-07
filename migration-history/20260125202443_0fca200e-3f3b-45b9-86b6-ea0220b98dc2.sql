-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Parents can view linked children profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a security definer function to check parent-child relationships without triggering RLS
CREATE OR REPLACE FUNCTION public.is_parent_of_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_child_links pcl
    JOIN profiles p ON pcl.parent_id = p.id
    WHERE p.user_id = auth.uid() AND pcl.child_id = profile_id
  );
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Parents can view linked children profiles"
ON public.profiles
FOR SELECT
USING (public.is_parent_of_profile(id));