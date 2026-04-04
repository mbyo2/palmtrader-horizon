
-- Fix options_trades: restrict INSERT to authenticated users with premium check
DROP POLICY IF EXISTS "Users can insert their own options trades" ON public.options_trades;
CREATE POLICY "Users can insert their own options trades"
  ON public.options_trades FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
