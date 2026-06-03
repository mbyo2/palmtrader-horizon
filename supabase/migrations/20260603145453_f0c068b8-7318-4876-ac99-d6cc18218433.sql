
-- Enable realtime for LuSE tables (instant UI refresh after trades)
ALTER TABLE public.luse_demo_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.luse_demo_positions REPLICA IDENTITY FULL;
ALTER TABLE public.luse_demo_trades REPLICA IDENTITY FULL;
ALTER TABLE public.luse_listings REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.luse_demo_accounts;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.luse_demo_positions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.luse_demo_trades;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.luse_listings;       EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Reconciliation: rebuild positions from trade history (source of truth)
CREATE OR REPLACE FUNCTION public.reconcile_luse_positions(p_user_id uuid)
RETURNS TABLE(symbol text, shares numeric, average_price numeric, realized_pnl numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_shares numeric;
  v_avg numeric;
  v_realized numeric;
  v_cash numeric;
  v_start numeric;
BEGIN
  IF auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  -- Ensure account
  INSERT INTO public.luse_demo_accounts(user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT starting_balance INTO v_start FROM public.luse_demo_accounts WHERE user_id = p_user_id;
  v_cash := COALESCE(v_start, 500000);

  -- Reset positions to zero (will repopulate)
  DELETE FROM public.luse_demo_positions WHERE user_id = p_user_id;

  -- Replay trades in order
  FOR r IN
    SELECT t.symbol, t.side, t.shares, t.price, t.total_fees, t.gross_amount, t.net_amount
    FROM public.luse_demo_trades t
    WHERE t.user_id = p_user_id AND t.status = 'filled'
    ORDER BY t.executed_at ASC
  LOOP
    SELECT lp.shares, lp.average_price, lp.realized_pnl
      INTO v_shares, v_avg, v_realized
      FROM public.luse_demo_positions lp
      WHERE lp.user_id = p_user_id AND lp.symbol = r.symbol;
    v_shares := COALESCE(v_shares, 0);
    v_avg := COALESCE(v_avg, 0);
    v_realized := COALESCE(v_realized, 0);

    IF r.side = 'buy' THEN
      v_avg := CASE WHEN v_shares + r.shares > 0
                    THEN (v_shares * v_avg + r.shares * r.price) / (v_shares + r.shares)
                    ELSE 0 END;
      v_shares := v_shares + r.shares;
      v_cash := v_cash - r.net_amount;
    ELSE
      v_realized := v_realized + (r.price - v_avg) * r.shares - r.total_fees;
      v_shares := v_shares - r.shares;
      v_cash := v_cash + r.net_amount;
    END IF;

    INSERT INTO public.luse_demo_positions(user_id, symbol, shares, average_price, realized_pnl)
    VALUES (p_user_id, r.symbol, v_shares, v_avg, v_realized)
    ON CONFLICT (user_id, symbol) DO UPDATE
      SET shares = EXCLUDED.shares,
          average_price = EXCLUDED.average_price,
          realized_pnl = EXCLUDED.realized_pnl,
          updated_at = now();
  END LOOP;

  -- Snap cash back to derived value
  UPDATE public.luse_demo_accounts
    SET cash_balance = v_cash, updated_at = now()
    WHERE user_id = p_user_id;

  RETURN QUERY
    SELECT lp.symbol, lp.shares, lp.average_price, lp.realized_pnl
    FROM public.luse_demo_positions lp
    WHERE lp.user_id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reconcile_luse_positions(uuid) TO authenticated;

-- Daily LuSE price refresh (no real API — gentle random walk so charts/portfolio move).
CREATE OR REPLACE FUNCTION public.refresh_luse_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  drift numeric;
  new_price numeric;
BEGIN
  FOR r IN SELECT id, last_price FROM public.luse_listings WHERE is_active = true LOOP
    -- ±2.5% daily move
    drift := (random() - 0.5) * 0.05;
    new_price := GREATEST(0.01, ROUND((r.last_price * (1 + drift))::numeric, 2));
    UPDATE public.luse_listings
      SET previous_close = last_price,
          last_price = new_price,
          updated_at = now()
      WHERE id = r.id;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.refresh_luse_prices() TO service_role;

-- Schedule daily price refresh at 15:05 CAT (after LuSE close = 13:05 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN
  PERFORM cron.unschedule('luse-daily-price-refresh');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'luse-daily-price-refresh',
  '5 13 * * 1-5',
  $$ SELECT public.refresh_luse_prices(); $$
);
