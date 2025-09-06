-- Add database indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_created ON trades(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_user_symbol ON portfolio(user_id, symbol);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_symbol_created ON comments(symbol, created_at DESC) WHERE symbol IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_alerts_user_active ON price_alerts(user_id, is_active, is_triggered);

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

-- Add API rate limiting table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint, window_start),
  UNIQUE(ip_address, endpoint, window_start)
);

-- Enable RLS on api_rate_limits
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Add function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_ip_address INET,
  p_endpoint TEXT,
  p_limit INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := DATE_TRUNC('minute', NOW()) - INTERVAL '1 minute' * (EXTRACT(minute FROM NOW())::INTEGER % p_window_minutes);
  
  -- Get current count for this window
  SELECT request_count INTO current_count
  FROM api_rate_limits
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND endpoint = p_endpoint
    AND window_start = window_start;
  
  IF current_count IS NULL THEN
    -- First request in this window
    INSERT INTO api_rate_limits (user_id, ip_address, endpoint, window_start)
    VALUES (p_user_id, p_ip_address, p_endpoint, window_start);
    RETURN TRUE;
  ELSIF current_count < p_limit THEN
    -- Increment counter
    UPDATE api_rate_limits
    SET request_count = request_count + 1
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
      AND endpoint = p_endpoint
      AND window_start = window_start;
    RETURN TRUE;
  ELSE
    -- Rate limit exceeded
    RETURN FALSE;
  END IF;
END;
$$;