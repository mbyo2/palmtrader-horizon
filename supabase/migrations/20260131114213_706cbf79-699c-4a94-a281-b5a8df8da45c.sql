-- Create enum for wallet types
CREATE TYPE wallet_type AS ENUM ('spot', 'funding', 'earn');

-- Create enum for P2P order status
CREATE TYPE p2p_order_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled', 'disputed');

-- Create enum for P2P payment status
CREATE TYPE p2p_payment_status AS ENUM ('pending', 'paid', 'confirmed', 'released', 'refunded');

-- Create enum for staking status
CREATE TYPE staking_status AS ENUM ('active', 'completed', 'withdrawn');

-- Create enum for launchpad status
CREATE TYPE launchpad_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');

-- Crypto wallets table (multiple wallet types per user per currency)
CREATE TABLE public.crypto_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  wallet_type wallet_type NOT NULL DEFAULT 'spot',
  available_balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
  locked_balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency, wallet_type)
);

-- P2P advertisements (buy/sell offers)
CREATE TABLE public.p2p_advertisements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  crypto_currency TEXT NOT NULL,
  fiat_currency TEXT NOT NULL DEFAULT 'USD',
  price NUMERIC(20, 8) NOT NULL,
  min_amount NUMERIC(20, 8) NOT NULL,
  max_amount NUMERIC(20, 8) NOT NULL,
  available_amount NUMERIC(20, 8) NOT NULL,
  payment_methods TEXT[] NOT NULL,
  terms TEXT,
  auto_reply TEXT,
  is_active BOOLEAN DEFAULT true,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  avg_release_time INTEGER DEFAULT 0, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- P2P orders (trades between users)
CREATE TABLE public.p2p_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advertisement_id UUID NOT NULL REFERENCES public.p2p_advertisements(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  crypto_currency TEXT NOT NULL,
  fiat_currency TEXT NOT NULL,
  crypto_amount NUMERIC(20, 8) NOT NULL,
  fiat_amount NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  payment_method TEXT NOT NULL,
  status p2p_order_status NOT NULL DEFAULT 'open',
  payment_status p2p_payment_status NOT NULL DEFAULT 'pending',
  escrow_released BOOLEAN DEFAULT false,
  buyer_confirmed_payment BOOLEAN DEFAULT false,
  seller_confirmed_receipt BOOLEAN DEFAULT false,
  chat_enabled BOOLEAN DEFAULT true,
  dispute_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- P2P chat messages
CREATE TABLE public.p2p_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.p2p_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Spot trading pairs
CREATE TABLE public.trading_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  min_order_size NUMERIC(20, 8) DEFAULT 0.0001,
  max_order_size NUMERIC(20, 8) DEFAULT 1000000,
  price_precision INTEGER DEFAULT 8,
  quantity_precision INTEGER DEFAULT 8,
  maker_fee NUMERIC(5, 4) DEFAULT 0.001,
  taker_fee NUMERIC(5, 4) DEFAULT 0.001,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_currency, quote_currency)
);

-- Spot orders
CREATE TABLE public.spot_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_id UUID NOT NULL REFERENCES public.trading_pairs(id),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop_limit')),
  price NUMERIC(20, 8),
  stop_price NUMERIC(20, 8),
  quantity NUMERIC(20, 8) NOT NULL,
  filled_quantity NUMERIC(20, 8) DEFAULT 0,
  remaining_quantity NUMERIC(20, 8),
  average_fill_price NUMERIC(20, 8),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partially_filled', 'filled', 'cancelled')),
  time_in_force TEXT DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trade history for spot
CREATE TABLE public.spot_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID NOT NULL REFERENCES public.trading_pairs(id),
  maker_order_id UUID NOT NULL REFERENCES public.spot_orders(id),
  taker_order_id UUID NOT NULL REFERENCES public.spot_orders(id),
  maker_user_id UUID NOT NULL REFERENCES auth.users(id),
  taker_user_id UUID NOT NULL REFERENCES auth.users(id),
  price NUMERIC(20, 8) NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL,
  maker_fee NUMERIC(20, 8) NOT NULL,
  taker_fee NUMERIC(20, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staking products
CREATE TABLE public.staking_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flexible', 'locked')),
  apy NUMERIC(6, 2) NOT NULL,
  min_amount NUMERIC(20, 8) NOT NULL,
  max_amount NUMERIC(20, 8),
  lock_period_days INTEGER, -- NULL for flexible
  total_pool NUMERIC(20, 8) DEFAULT 0,
  remaining_pool NUMERIC(20, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User staking positions
CREATE TABLE public.staking_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.staking_products(id),
  amount NUMERIC(20, 8) NOT NULL,
  accrued_interest NUMERIC(20, 8) DEFAULT 0,
  status staking_status NOT NULL DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  last_interest_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  auto_restake BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Futures positions (simulation)
CREATE TABLE public.futures_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  entry_price NUMERIC(20, 8) NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  margin NUMERIC(20, 8) NOT NULL,
  liquidation_price NUMERIC(20, 8),
  take_profit NUMERIC(20, 8),
  stop_loss NUMERIC(20, 8),
  unrealized_pnl NUMERIC(20, 8) DEFAULT 0,
  realized_pnl NUMERIC(20, 8) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated')),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Launchpad projects
CREATE TABLE public.launchpad_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  whitepaper_url TEXT,
  total_tokens NUMERIC(20, 8) NOT NULL,
  price_per_token NUMERIC(20, 8) NOT NULL,
  payment_currency TEXT NOT NULL DEFAULT 'USDT',
  min_purchase NUMERIC(20, 8) NOT NULL,
  max_purchase NUMERIC(20, 8) NOT NULL,
  tokens_sold NUMERIC(20, 8) DEFAULT 0,
  status launchpad_status NOT NULL DEFAULT 'upcoming',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  distribution_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Launchpad subscriptions
CREATE TABLE public.launchpad_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.launchpad_projects(id),
  committed_amount NUMERIC(20, 8) NOT NULL,
  tokens_allocated NUMERIC(20, 8) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  tokens_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Convert/Swap history
CREATE TABLE public.convert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  from_amount NUMERIC(20, 8) NOT NULL,
  to_amount NUMERIC(20, 8) NOT NULL,
  rate NUMERIC(20, 8) NOT NULL,
  fee NUMERIC(20, 8) DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.futures_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launchpad_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launchpad_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convert_history ENABLE ROW LEVEL SECURITY;

-- Crypto wallets policies
CREATE POLICY "Users can view their own wallets" ON public.crypto_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wallets" ON public.crypto_wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wallets" ON public.crypto_wallets FOR UPDATE USING (auth.uid() = user_id);

-- P2P advertisements policies
CREATE POLICY "Anyone can view active ads" ON public.p2p_advertisements FOR SELECT USING (is_active = true OR auth.uid() = user_id);
CREATE POLICY "Users can create their own ads" ON public.p2p_advertisements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ads" ON public.p2p_advertisements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ads" ON public.p2p_advertisements FOR DELETE USING (auth.uid() = user_id);

-- P2P orders policies
CREATE POLICY "Users can view their orders" ON public.p2p_orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can create orders" ON public.p2p_orders FOR INSERT WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Participants can update orders" ON public.p2p_orders FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- P2P messages policies
CREATE POLICY "Order participants can view messages" ON public.p2p_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.p2p_orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);
CREATE POLICY "Order participants can send messages" ON public.p2p_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.p2p_orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);

-- Trading pairs - public read
CREATE POLICY "Anyone can view trading pairs" ON public.trading_pairs FOR SELECT USING (true);

-- Spot orders policies
CREATE POLICY "Users can view their orders" ON public.spot_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.spot_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their orders" ON public.spot_orders FOR UPDATE USING (auth.uid() = user_id);

-- Spot trades policies
CREATE POLICY "Users can view their trades" ON public.spot_trades FOR SELECT USING (auth.uid() = maker_user_id OR auth.uid() = taker_user_id);

-- Staking products - public read
CREATE POLICY "Anyone can view staking products" ON public.staking_products FOR SELECT USING (true);

-- Staking positions policies
CREATE POLICY "Users can view their positions" ON public.staking_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create positions" ON public.staking_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their positions" ON public.staking_positions FOR UPDATE USING (auth.uid() = user_id);

-- Futures positions policies
CREATE POLICY "Users can view their futures" ON public.futures_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create futures" ON public.futures_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their futures" ON public.futures_positions FOR UPDATE USING (auth.uid() = user_id);

-- Launchpad projects - public read
CREATE POLICY "Anyone can view projects" ON public.launchpad_projects FOR SELECT USING (true);

-- Launchpad subscriptions policies
CREATE POLICY "Users can view their subscriptions" ON public.launchpad_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create subscriptions" ON public.launchpad_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their subscriptions" ON public.launchpad_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Convert history policies
CREATE POLICY "Users can view their conversions" ON public.convert_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create conversions" ON public.convert_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default trading pairs
INSERT INTO public.trading_pairs (base_currency, quote_currency, min_order_size, maker_fee, taker_fee) VALUES
('BTC', 'USDT', 0.0001, 0.001, 0.001),
('ETH', 'USDT', 0.001, 0.001, 0.001),
('BTC', 'ETH', 0.0001, 0.001, 0.001),
('SOL', 'USDT', 0.01, 0.001, 0.001),
('XRP', 'USDT', 1, 0.001, 0.001),
('ADA', 'USDT', 1, 0.001, 0.001),
('DOT', 'USDT', 0.1, 0.001, 0.001),
('DOGE', 'USDT', 10, 0.001, 0.001);

-- Insert staking products
INSERT INTO public.staking_products (currency, name, type, apy, min_amount, lock_period_days, remaining_pool) VALUES
('BTC', 'BTC Flexible Savings', 'flexible', 1.5, 0.0001, NULL, 1000),
('ETH', 'ETH Flexible Savings', 'flexible', 2.5, 0.01, NULL, 10000),
('USDT', 'USDT Flexible Savings', 'flexible', 5.0, 10, NULL, 1000000),
('BTC', 'BTC 30-Day Locked', 'locked', 3.0, 0.001, 30, 500),
('ETH', 'ETH 60-Day Locked', 'locked', 6.0, 0.1, 60, 5000),
('USDT', 'USDT 90-Day Locked', 'locked', 10.0, 100, 90, 500000);

-- Insert sample launchpad project
INSERT INTO public.launchpad_projects (name, symbol, description, total_tokens, price_per_token, payment_currency, min_purchase, max_purchase, start_time, end_time, status) VALUES
('DeFi Protocol Token', 'DFP', 'A revolutionary DeFi protocol for cross-chain lending and borrowing', 10000000, 0.10, 'USDT', 100, 10000, now() + interval '7 days', now() + interval '14 days', 'upcoming');

-- Create triggers for updated_at
CREATE TRIGGER update_crypto_wallets_updated_at BEFORE UPDATE ON public.crypto_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_p2p_advertisements_updated_at BEFORE UPDATE ON public.p2p_advertisements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_p2p_orders_updated_at BEFORE UPDATE ON public.p2p_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_spot_orders_updated_at BEFORE UPDATE ON public.spot_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staking_products_updated_at BEFORE UPDATE ON public.staking_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staking_positions_updated_at BEFORE UPDATE ON public.staking_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_futures_positions_updated_at BEFORE UPDATE ON public.futures_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_launchpad_projects_updated_at BEFORE UPDATE ON public.launchpad_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_launchpad_subscriptions_updated_at BEFORE UPDATE ON public.launchpad_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();