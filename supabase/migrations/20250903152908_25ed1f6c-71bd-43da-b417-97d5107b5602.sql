-- Fix remaining security issues for user_follows and comment_likes tables

-- Update user_follows RLS to be more restrictive
-- Users should only see their own follow relationships
DROP POLICY IF EXISTS "Users can view follows they are involved in" ON public.user_follows;

CREATE POLICY "Users can view their own following relationships"
ON public.user_follows 
FOR SELECT 
USING (auth.uid() = follower_id);

-- Update comment_likes to be more restrictive
-- Only authenticated users can view likes, and only for their own likes or on their comments
DROP POLICY IF EXISTS "Users can view likes" ON public.comment_likes;

CREATE POLICY "Users can view likes on their content"
ON public.comment_likes 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.comments 
    WHERE comments.id = comment_likes.comment_id 
    AND comments.user_id = auth.uid()
  )
);