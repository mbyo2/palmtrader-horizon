
-- Add flagged and moderation_notes columns to comments table
ALTER TABLE public.comments 
ADD COLUMN flagged boolean DEFAULT false,
ADD COLUMN moderation_notes text;
