-- Fix critical security issues with comments table and user_follows

-- 1. Fix comments table - hide moderation data from public view
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;

-- Create more restrictive policy for comments
CREATE POLICY "Users can view public comments without moderation data"
ON public.comments 
FOR SELECT 
USING (
  -- Users can see their own comments (including when flagged)
  auth.uid() = user_id 
  OR 
  -- Users can see non-flagged comments from others
  (flagged = false OR flagged IS NULL)
);

-- 2. Further restrict user_follows table - users should only see their own follows
DROP POLICY IF EXISTS "Users can view their own following relationships" ON public.user_follows;

CREATE POLICY "Users can only view their own follow relationships"
ON public.user_follows 
FOR SELECT 
USING (auth.uid() = follower_id);

-- 3. Add policy to allow viewing follower counts without exposing relationships
CREATE POLICY "Users can view follower counts for profiles"
ON public.user_follows 
FOR SELECT 
USING (false); -- Disable this policy, we'll handle counts via functions

-- 4. Create a secure function to get follower counts without exposing relationships
CREATE OR REPLACE FUNCTION get_user_follower_count(target_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_follows
  WHERE following_id = target_user_id;
$$;

-- 5. Create a secure function to get following count
CREATE OR REPLACE FUNCTION get_user_following_count(target_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_follows
  WHERE follower_id = target_user_id;
$$;