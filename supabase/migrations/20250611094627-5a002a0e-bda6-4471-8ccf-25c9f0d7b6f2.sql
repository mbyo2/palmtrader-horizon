
-- Create push_subscriptions table for storing push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint to ensure one subscription per user
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT unique_user_subscription UNIQUE (user_id);

-- Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own push subscriptions" 
  ON public.push_subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own push subscriptions" 
  ON public.push_subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions" 
  ON public.push_subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" 
  ON public.push_subscriptions 
  FOR DELETE 
  USING (auth.uid() = user_id);
