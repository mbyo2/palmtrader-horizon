-- Fix security issues identified in the scan

-- 1. Update profiles table RLS policy to restrict public access
-- Remove the current public read policy and replace with authenticated users only
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Create new policy for authenticated users to view profiles 
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Update user_follows table RLS policies to restrict public access
-- First, let's see what policies exist and then create proper ones
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
DROP POLICY IF EXISTS "Public can view follows" ON public.user_follows;

-- Create proper RLS policies for user_follows
CREATE POLICY "Users can view follows they are involved in"
ON public.user_follows 
FOR SELECT 
USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can create their own follows"
ON public.user_follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows"
ON public.user_follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- 3. Enable leaked password protection
-- Note: This needs to be done through Supabase dashboard, but we can create a reminder