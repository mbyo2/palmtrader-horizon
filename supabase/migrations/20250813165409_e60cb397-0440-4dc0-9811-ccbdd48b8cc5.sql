-- Create helper function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Positions table
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  shares NUMERIC NOT NULL DEFAULT 0,
  average_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='positions' AND policyname='Users manage own positions'
  ) THEN
    CREATE POLICY "Users manage own positions" ON public.positions
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TRIGGER positions_set_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL, -- buy | sell
  order_type TEXT NOT NULL DEFAULT 'market', -- market | limit | stop
  shares NUMERIC NOT NULL,
  price NUMERIC,
  limit_price NUMERIC,
  stop_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Users manage own orders'
  ) THEN
    CREATE POLICY "Users manage own orders" ON public.orders
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order history table
CREATE TABLE IF NOT EXISTS public.order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

-- Only service role can modify history; users can view their own
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_history' AND policyname='Service role can modify order history'
  ) THEN
    CREATE POLICY "Service role can modify order history" ON public.order_history
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_history' AND policyname='Users can view their own order history'
  ) THEN
    CREATE POLICY "Users can view their own order history" ON public.order_history
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users manage own notifications'
  ) THEN
    CREATE POLICY "Users manage own notifications" ON public.notifications
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure watchlists has updated_at for realtime consistency
ALTER TABLE public.watchlists
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER watchlists_set_updated_at
BEFORE UPDATE ON public.watchlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime: ensure FULL replica identity and publication membership
DO $$ BEGIN
  PERFORM 1 FROM pg_class WHERE relname = 'positions';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE public.positions REPLICA IDENTITY FULL';
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_class WHERE relname = 'orders';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE public.orders REPLICA IDENTITY FULL';
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_class WHERE relname = 'order_history';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE public.order_history REPLICA IDENTITY FULL';
  END IF;
END $$;

ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER TABLE public.portfolio REPLICA IDENTITY FULL;
ALTER TABLE public.price_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.watchlists REPLICA IDENTITY FULL;

-- Add tables to realtime publication (safe if already added)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS
  public.trades,
  public.portfolio,
  public.price_alerts,
  public.watchlists,
  public.positions,
  public.orders,
  public.order_history,
  public.notifications;
