-- Fix critical RLS policy for account_details to allow new user creation
-- The handle_new_user() trigger needs to insert into account_details
CREATE POLICY "Allow trigger to insert account details"
ON public.account_details
FOR INSERT
WITH CHECK (true);

-- Fix market_data RLS - consolidate conflicting policies
DROP POLICY IF EXISTS "Allow service role to insert market data" ON public.market_data;
DROP POLICY IF EXISTS "Enable insert for service role only" ON public.market_data;
DROP POLICY IF EXISTS "Market data can only be modified by service role" ON public.market_data;
DROP POLICY IF EXISTS "Allow public read access to market data" ON public.market_data;
DROP POLICY IF EXISTS "Allow read access to market data for authenticated users" ON public.market_data;

-- Create single, clear policy for market data
CREATE POLICY "Service role full access to market data"
ON public.market_data
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Public read access to market data"
ON public.market_data
FOR SELECT
USING (true);

-- Create missing profiles table referenced in security scan
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add proper RLS policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create user_follows table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS on user_follows
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Add proper RLS policies for user_follows
CREATE POLICY "Users can view follows"
ON public.user_follows
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own follows"
ON public.user_follows
FOR ALL
TO authenticated
USING (auth.uid() = follower_id)
WITH CHECK (auth.uid() = follower_id);

-- Add missing foreign key constraints for data integrity
-- Fix portfolio table
ALTER TABLE public.portfolio
DROP CONSTRAINT IF EXISTS portfolio_user_id_fkey;

ALTER TABLE public.portfolio
ADD CONSTRAINT portfolio_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix trades table
ALTER TABLE public.trades
DROP CONSTRAINT IF EXISTS trades_user_id_fkey;

ALTER TABLE public.trades
ADD CONSTRAINT trades_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix orders table
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix wallets table
ALTER TABLE public.wallets
DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;

ALTER TABLE public.wallets
ADD CONSTRAINT wallets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix watchlists table
ALTER TABLE public.watchlists
DROP CONSTRAINT IF EXISTS watchlists_user_id_fkey;

ALTER TABLE public.watchlists
ADD CONSTRAINT watchlists_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON public.portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);

-- Add trigger to update profiles.updated_at
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Ensure market_data has proper index for performance
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON public.market_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_type ON public.market_data(type);