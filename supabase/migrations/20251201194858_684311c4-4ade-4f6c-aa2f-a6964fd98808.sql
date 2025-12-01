-- Create enum for account types (Vantage-style)
CREATE TYPE public.trading_account_type AS ENUM (
  'demo',           -- Practice account with virtual funds
  'cent',           -- Beginner account with minimal deposits
  'standard_stp',   -- Standard STP account, commission-free
  'raw_ecn',        -- Raw ECN with tight spreads
  'pro_ecn',        -- Professional ECN for high-volume traders
  'islamic'         -- Swap-free account for Sharia compliance
);

-- Create trading accounts table
CREATE TABLE public.trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number VARCHAR(20) NOT NULL UNIQUE,
  account_type public.trading_account_type NOT NULL DEFAULT 'demo',
  account_name VARCHAR(100),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
  available_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
  reserved_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
  leverage INTEGER NOT NULL DEFAULT 100,
  max_leverage INTEGER NOT NULL DEFAULT 500,
  min_deposit DECIMAL(18, 2) NOT NULL DEFAULT 50,
  commission_per_lot DECIMAL(6, 2) DEFAULT 0,
  spread_type VARCHAR(20) DEFAULT 'variable',
  min_spread DECIMAL(6, 2) DEFAULT 1.4,
  margin_call_level INTEGER DEFAULT 100,
  stop_out_level INTEGER DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  trading_disabled BOOLEAN NOT NULL DEFAULT false,
  trading_disabled_reason TEXT,
  sec_zambia_compliant BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create account type configurations table
CREATE TABLE public.account_type_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_type public.trading_account_type NOT NULL UNIQUE,
  display_name VARCHAR(50) NOT NULL,
  description TEXT,
  min_deposit DECIMAL(18, 2) NOT NULL,
  max_leverage INTEGER NOT NULL DEFAULT 500,
  commission_per_lot DECIMAL(6, 2) DEFAULT 0,
  min_spread DECIMAL(6, 2) NOT NULL,
  execution_type VARCHAR(20) NOT NULL,
  is_swap_free BOOLEAN NOT NULL DEFAULT false,
  features JSONB DEFAULT '[]',
  requirements TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert account type configurations (Vantage-style)
INSERT INTO public.account_type_configs (account_type, display_name, description, min_deposit, max_leverage, commission_per_lot, min_spread, execution_type, is_swap_free, features, requirements) VALUES
('demo', 'Demo Account', 'Practice trading with virtual funds. Perfect for learning without risk.', 0, 500, 0, 1.4, 'STP', false, '["Virtual funds", "Full platform access", "Real-time market data", "No time limit"]', 'Email verification only'),
('cent', 'Cent Account', 'Start trading with minimal investment. Balance shown in cents for comfortable trading.', 50, 500, 0, 1.4, 'STP', false, '["Low minimum deposit", "Balance in cents", "Perfect for beginners", "Promotional bonuses eligible"]', 'Basic KYC verification'),
('standard_stp', 'Standard STP', 'Commission-free trading with competitive spreads. Ideal for retail traders.', 200, 500, 0, 1.4, 'STP', false, '["Commission-free trading", "Spreads from 1.4 pips", "MT4/MT5 access", "40+ Forex pairs", "Promotional bonuses eligible"]', 'Full KYC verification'),
('raw_ecn', 'Raw ECN', 'Ultra-tight spreads with transparent pricing. For active traders seeking best execution.', 500, 500, 3.00, 0.0, 'ECN', false, '["Raw spreads from 0.0 pips", "Low commission $3/lot", "Deep liquidity", "Fast execution", "Institutional pricing"]', 'Full KYC verification'),
('pro_ecn', 'Pro ECN', 'Professional-grade trading conditions. Designed for high-volume and institutional traders.', 20000, 500, 1.50, 0.0, 'ECN', false, '["Lowest spreads", "Reduced commission $1.50/lot", "Priority execution", "Dedicated support", "Advanced tools"]', 'Full KYC + Professional trader verification'),
('islamic', 'Islamic Account', 'Swap-free trading compliant with Sharia law. No overnight interest charges.', 200, 500, 3.00, 1.0, 'STP', true, '["No swap/interest charges", "Sharia compliant", "Extended holding periods", "All markets accessible"]', 'Full KYC + Islamic account declaration');

-- Enable RLS on trading_accounts
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for trading_accounts
CREATE POLICY "Users can view their own trading accounts"
  ON public.trading_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading accounts"
  ON public.trading_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading accounts"
  ON public.trading_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin policy for trading_accounts
CREATE POLICY "Admins can manage all trading accounts"
  ON public.trading_accounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.account_details
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS on account_type_configs
ALTER TABLE public.account_type_configs ENABLE ROW LEVEL SECURITY;

-- Everyone can view account type configs
CREATE POLICY "Anyone can view account type configs"
  ON public.account_type_configs
  FOR SELECT
  USING (true);

-- Only admins can modify account type configs
CREATE POLICY "Admins can manage account type configs"
  ON public.account_type_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.account_details
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to generate account number
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  prefix TEXT;
BEGIN
  prefix := 'ZMT'; -- Zambia Trading prefix
  new_number := prefix || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
  WHILE EXISTS (SELECT 1 FROM public.trading_accounts WHERE account_number = new_number) LOOP
    new_number := prefix || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
  END LOOP;
  RETURN new_number;
END;
$$;

-- Trigger to auto-generate account number
CREATE OR REPLACE FUNCTION public.set_account_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_number IS NULL OR NEW.account_number = '' THEN
    NEW.account_number := public.generate_account_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_account_number
  BEFORE INSERT ON public.trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_account_number();

-- Trigger for updated_at
CREATE TRIGGER update_trading_accounts_updated_at
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_account_type_configs_updated_at
  BEFORE UPDATE ON public.account_type_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX idx_trading_accounts_account_type ON public.trading_accounts(account_type);
CREATE INDEX idx_trading_accounts_is_active ON public.trading_accounts(is_active);