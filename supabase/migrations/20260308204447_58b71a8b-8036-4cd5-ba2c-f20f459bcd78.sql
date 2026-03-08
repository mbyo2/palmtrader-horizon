
-- Copy trading system tables
CREATE TABLE public.copy_trading_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allocation_amount NUMERIC NOT NULL DEFAULT 0,
  max_trade_size NUMERIC DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_profit NUMERIC DEFAULT 0,
  total_trades_copied INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, leader_id)
);

CREATE TABLE public.copy_trading_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_trade_symbol TEXT NOT NULL,
  original_trade_side TEXT NOT NULL,
  original_trade_price NUMERIC NOT NULL,
  copied_quantity NUMERIC NOT NULL,
  copied_price NUMERIC NOT NULL,
  profit_loss NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'executed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.trader_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  bio TEXT,
  total_return_pct NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  risk_score NUMERIC DEFAULT 5,
  is_verified BOOLEAN DEFAULT false,
  specialization TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.copy_trading_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_trading_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trader_stats ENABLE ROW LEVEL SECURITY;

-- Copy trading follows policies
CREATE POLICY "Users can view their own follows" ON public.copy_trading_follows FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = leader_id);
CREATE POLICY "Users can create follows" ON public.copy_trading_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can update their follows" ON public.copy_trading_follows FOR UPDATE USING (auth.uid() = follower_id);
CREATE POLICY "Users can delete their follows" ON public.copy_trading_follows FOR DELETE USING (auth.uid() = follower_id);

-- Copy trading trades policies
CREATE POLICY "Users can view their copy trades" ON public.copy_trading_trades FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = leader_id);
CREATE POLICY "System can insert copy trades" ON public.copy_trading_trades FOR INSERT WITH CHECK (true);

-- Trader stats policies
CREATE POLICY "Anyone can view public trader stats" ON public.trader_stats FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own stats" ON public.trader_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stats" ON public.trader_stats FOR UPDATE USING (auth.uid() = user_id);
