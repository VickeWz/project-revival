-- Add onboarding_complete column to profiles
ALTER TABLE public.profiles ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT false;