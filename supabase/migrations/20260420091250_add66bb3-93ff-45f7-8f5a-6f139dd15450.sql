-- Link Lovable users to their Alpaca Broker sub-accounts
ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS alpaca_account_id TEXT,
  ADD COLUMN IF NOT EXISTS alpaca_account_status TEXT,
  ADD COLUMN IF NOT EXISTS alpaca_account_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trading_accounts_alpaca_account_id
  ON public.trading_accounts(alpaca_account_id)
  WHERE alpaca_account_id IS NOT NULL;

-- Track Alpaca order ids for reconciliation
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS alpaca_order_id TEXT,
  ADD COLUMN IF NOT EXISTS broker TEXT DEFAULT 'internal';

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS alpaca_order_id TEXT,
  ADD COLUMN IF NOT EXISTS broker TEXT DEFAULT 'internal';

CREATE INDEX IF NOT EXISTS idx_orders_alpaca_order_id
  ON public.orders(alpaca_order_id) WHERE alpaca_order_id IS NOT NULL;