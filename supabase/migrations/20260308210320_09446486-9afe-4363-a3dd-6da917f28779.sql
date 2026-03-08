
-- Fix: drop and recreate spot_trades with proper schema
DROP TABLE IF EXISTS public.spot_trades CASCADE;

CREATE TABLE public.spot_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES public.trading_pairs(id),
  buy_order_id uuid NOT NULL REFERENCES public.spot_orders(id),
  sell_order_id uuid NOT NULL REFERENCES public.spot_orders(id),
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  buyer_fee numeric NOT NULL DEFAULT 0,
  seller_fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spot_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trades for their orders" ON public.spot_trades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM spot_orders WHERE id = spot_trades.buy_order_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM spot_orders WHERE id = spot_trades.sell_order_id AND user_id = auth.uid())
  );
