-- Fix database security issues and add missing functionality

-- 1. Fix function search paths for security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.account_details (id)
  VALUES (new.id);
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_price_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE price_alerts pa
  SET 
    is_triggered = true,
    updated_at = NOW()
  FROM market_data md
  WHERE 
    pa.symbol = NEW.symbol
    AND pa.is_active = true 
    AND pa.is_triggered = false
    AND (
      (pa.condition = 'above' AND NEW.price >= pa.target_price)
      OR 
      (pa.condition = 'below' AND NEW.price <= pa.target_price)
    );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_popular_stocks()
RETURNS TABLE(symbol text, comment_count bigint, unique_users bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    symbol,
    COUNT(*) as comment_count,
    COUNT(DISTINCT user_id) as unique_users
  FROM public.comments
  WHERE symbol IS NOT NULL
  GROUP BY symbol
  ORDER BY comment_count DESC, unique_users DESC
  LIMIT 10;
$function$;

CREATE OR REPLACE FUNCTION public.update_portfolio_after_trade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- For buy orders
  IF NEW.type = 'buy' THEN
    INSERT INTO portfolio (user_id, symbol, shares, average_price)
    VALUES (
      NEW.user_id,
      NEW.symbol,
      NEW.shares,
      NEW.price
    )
    ON CONFLICT (user_id, symbol)
    DO UPDATE SET
      shares = portfolio.shares + NEW.shares,
      average_price = (portfolio.shares * portfolio.average_price + NEW.shares * NEW.price) / (portfolio.shares + NEW.shares),
      updated_at = NOW();
  
  -- For sell orders
  ELSIF NEW.type = 'sell' THEN
    UPDATE portfolio
    SET
      shares = shares - NEW.shares,
      updated_at = NOW()
    WHERE user_id = NEW.user_id AND symbol = NEW.symbol;
    
    -- Delete portfolio entry if shares become 0
    DELETE FROM portfolio
    WHERE user_id = NEW.user_id AND symbol = NEW.symbol AND shares <= 0;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Create missing tables that components are referencing

-- Positions table for real-time position tracking
CREATE TABLE IF NOT EXISTS public.positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  average_cost numeric NOT NULL,
  market_value numeric,
  unrealized_pnl numeric,
  realized_pnl numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

-- Orders table for pending orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  order_type text NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity numeric NOT NULL,
  price numeric,
  limit_price numeric,
  stop_price numeric,
  time_in_force text NOT NULL DEFAULT 'day' CHECK (time_in_force IN ('day', 'gtc', 'ioc', 'fok')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'rejected', 'partial')),
  filled_quantity numeric DEFAULT 0,
  average_fill_price numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Order history table
CREATE TABLE IF NOT EXISTS public.order_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  order_type text NOT NULL,
  side text NOT NULL,
  quantity numeric NOT NULL,
  price numeric,
  filled_quantity numeric,
  average_fill_price numeric,
  status text NOT NULL,
  status_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Enable RLS on new tables
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for new tables
CREATE POLICY "Users can manage their own positions" ON public.positions
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own orders" ON public.orders
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own order history" ON public.order_history
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert order history" ON public.order_history
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage their own notifications" ON public.notifications
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_positions_user_symbol ON public.positions(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_order_history_user_created ON public.order_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);

-- 6. Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Add missing columns to existing tables if needed
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS executed_at timestamp with time zone;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS commission numeric DEFAULT 0;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS fees numeric DEFAULT 0;

-- 8. Add trigger to update portfolio when trades are executed
CREATE OR REPLACE FUNCTION public.handle_trade_execution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only process completed trades
  IF NEW.status = 'completed' THEN
    -- Update positions table
    INSERT INTO positions (user_id, symbol, quantity, average_cost)
    VALUES (
      NEW.user_id,
      NEW.symbol,
      CASE WHEN NEW.type = 'buy' THEN NEW.shares ELSE -NEW.shares END,
      NEW.price
    )
    ON CONFLICT (user_id, symbol)
    DO UPDATE SET
      quantity = positions.quantity + CASE WHEN NEW.type = 'buy' THEN NEW.shares ELSE -NEW.shares END,
      average_cost = CASE 
        WHEN NEW.type = 'buy' THEN 
          (positions.quantity * positions.average_cost + NEW.shares * NEW.price) / (positions.quantity + NEW.shares)
        ELSE positions.average_cost
      END,
      updated_at = NOW();
    
    -- Create notification
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'trade_executed',
      'Trade Executed',
      format('%s %s shares of %s at $%s', 
        CASE WHEN NEW.type = 'buy' THEN 'Bought' ELSE 'Sold' END,
        NEW.shares,
        NEW.symbol,
        NEW.price
      ),
      jsonb_build_object('trade_id', NEW.id, 'symbol', NEW.symbol, 'type', NEW.type, 'shares', NEW.shares, 'price', NEW.price)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trade_execution_trigger
  AFTER INSERT OR UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trade_execution();