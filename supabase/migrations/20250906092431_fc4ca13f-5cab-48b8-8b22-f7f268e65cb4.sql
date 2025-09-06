-- Add database indexes for performance optimization  
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_created ON trades(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_user_symbol ON portfolio(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_symbol_created ON comments(symbol, created_at DESC) WHERE symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_active ON price_alerts(user_id, is_active, is_triggered);

-- Add wallet_balances table for proper balance management
CREATE TABLE IF NOT EXISTS wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  available_balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
  reserved_balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
  total_balance NUMERIC(20, 8) GENERATED ALWAYS AS (available_balance + reserved_balance) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

-- Enable RLS on wallet_balances
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallet_balances
CREATE POLICY "Users can view their own wallet balances"
ON wallet_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet balances"
ON wallet_balances FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet balances"
ON wallet_balances FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_wallet_balances_updated_at
  BEFORE UPDATE ON wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();