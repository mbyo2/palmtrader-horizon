
-- LuSE listings catalog (public read)
CREATE TABLE public.luse_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  company_name text NOT NULL,
  sector text,
  currency text NOT NULL DEFAULT 'ZMW',
  last_price numeric NOT NULL,
  previous_close numeric NOT NULL,
  day_change_pct numeric GENERATED ALWAYS AS (
    CASE WHEN previous_close > 0 THEN ((last_price - previous_close) / previous_close) * 100 ELSE 0 END
  ) STORED,
  market_cap numeric,
  shares_outstanding numeric,
  lot_size integer NOT NULL DEFAULT 100,
  tick_size numeric NOT NULL DEFAULT 0.01,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.luse_listings TO anon, authenticated;
GRANT ALL ON public.luse_listings TO service_role;
ALTER TABLE public.luse_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LuSE listings are public" ON public.luse_listings FOR SELECT USING (true);

-- LuSE demo cash account (ZMW). Separate from real wallets / Alpaca paper.
CREATE TABLE public.luse_demo_accounts (
  user_id uuid PRIMARY KEY,
  cash_balance numeric NOT NULL DEFAULT 500000, -- K500,000 starting demo cash
  reserved_balance numeric NOT NULL DEFAULT 0,
  starting_balance numeric NOT NULL DEFAULT 500000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.luse_demo_accounts TO authenticated;
GRANT ALL ON public.luse_demo_accounts TO service_role;
ALTER TABLE public.luse_demo_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own luse demo account" ON public.luse_demo_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own luse demo account" ON public.luse_demo_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own luse demo account" ON public.luse_demo_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- LuSE demo positions
CREATE TABLE public.luse_demo_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  shares numeric NOT NULL DEFAULT 0,
  average_price numeric NOT NULL DEFAULT 0,
  realized_pnl numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.luse_demo_positions TO authenticated;
GRANT ALL ON public.luse_demo_positions TO service_role;
ALTER TABLE public.luse_demo_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own luse positions" ON public.luse_demo_positions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own luse positions" ON public.luse_demo_positions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LuSE demo trades (history)
CREATE TABLE public.luse_demo_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy','sell')),
  shares numeric NOT NULL,
  price numeric NOT NULL,
  gross_amount numeric NOT NULL,
  brokerage_fee numeric NOT NULL DEFAULT 0,
  sec_levy numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  csd_fee numeric NOT NULL DEFAULT 0,
  total_fees numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  realized_pnl numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'filled',
  trade_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lusaka')::date,
  settlement_date date NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.luse_demo_trades TO authenticated;
GRANT ALL ON public.luse_demo_trades TO service_role;
ALTER TABLE public.luse_demo_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own luse trades" ON public.luse_demo_trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own luse trades" ON public.luse_demo_trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_luse_trades_user_executed ON public.luse_demo_trades(user_id, executed_at DESC);
CREATE INDEX idx_luse_positions_user ON public.luse_demo_positions(user_id);

-- Touch updated_at triggers
CREATE TRIGGER trg_luse_listings_updated BEFORE UPDATE ON public.luse_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_luse_accounts_updated BEFORE UPDATE ON public.luse_demo_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_luse_positions_updated BEFORE UPDATE ON public.luse_demo_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reset demo function (called by user; SECURITY DEFINER so it can clear everything)
CREATE OR REPLACE FUNCTION public.reset_luse_demo(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  DELETE FROM public.luse_demo_positions WHERE user_id = p_user_id;
  DELETE FROM public.luse_demo_trades WHERE user_id = p_user_id;
  INSERT INTO public.luse_demo_accounts(user_id, cash_balance, reserved_balance, starting_balance)
  VALUES (p_user_id, 500000, 0, 500000)
  ON CONFLICT (user_id) DO UPDATE
    SET cash_balance = 500000, reserved_balance = 0, starting_balance = 500000, updated_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.reset_luse_demo(uuid) TO authenticated;

-- Seed LuSE listings (representative main-board names, ZMW prices)
INSERT INTO public.luse_listings (symbol, company_name, sector, last_price, previous_close, market_cap, shares_outstanding, lot_size) VALUES
('AECI', 'AECI Mining Chemicals Zambia', 'Materials', 12.50, 12.30, 1250000000, 100000000, 100),
('AEL',  'African Explosives Zambia', 'Industrials', 8.75, 8.60, 875000000, 100000000, 100),
('ATEL', 'Airtel Networks Zambia Plc', 'Telecommunications', 4.20, 4.15, 16800000000, 4000000000, 100),
('BATA', 'BATA Shoe Company of Zambia', 'Consumer Discretionary', 2.10, 2.05, 210000000, 100000000, 100),
('CECZ', 'Copperbelt Energy Corporation Plc', 'Utilities', 1.85, 1.80, 18500000000, 10000000000, 100),
('CCHZ', 'Chilanga Cement Plc', 'Materials', 9.40, 9.50, 9400000000, 1000000000, 100),
('FQMZ', 'First Quantum Mining Operations', 'Materials', 145.00, 142.50, 145000000000, 1000000000, 100),
('INVL', 'Investrust Bank Plc', 'Financials', 1.25, 1.22, 1250000000, 1000000000, 100),
('LAFA', 'Lafarge Zambia Plc', 'Materials', 7.80, 7.75, 7800000000, 1000000000, 100),
('MFIN', 'Madison Financial Services', 'Financials', 0.95, 0.93, 950000000, 1000000000, 100),
('NATB', 'National Breweries Plc', 'Consumer Staples', 18.50, 18.20, 18500000000, 1000000000, 100),
('PAMO', 'Pamodzi Hotels Plc', 'Consumer Discretionary', 0.45, 0.44, 450000000, 1000000000, 100),
('PRIN', 'Prima Reinsurance Plc', 'Financials', 1.10, 1.08, 1100000000, 1000000000, 100),
('PUMA', 'Puma Energy Zambia Plc', 'Energy', 3.60, 3.55, 3600000000, 1000000000, 100),
('REIZ', 'Real Estate Investments Zambia Plc', 'Real Estate', 2.85, 2.80, 2850000000, 1000000000, 100),
('SCBT', 'Standard Chartered Bank Zambia Plc', 'Financials', 5.40, 5.35, 5400000000, 1000000000, 100),
('ZAMB', 'Zambeef Products Plc', 'Consumer Staples', 4.95, 4.90, 4950000000, 1000000000, 100),
('ZSUG', 'Zambia Sugar Plc', 'Consumer Staples', 3.20, 3.15, 3200000000, 1000000000, 100),
('ZMFA', 'Metal Fabricators of Zambia Plc', 'Industrials', 1.55, 1.52, 1550000000, 1000000000, 100),
('ZCCM', 'ZCCM Investment Holdings Plc', 'Materials', 26.50, 26.20, 42400000000, 1600000000, 100);
