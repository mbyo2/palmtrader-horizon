
-- 1. Add updated_at column to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Fix wallets RLS: allow users to update their OWN wallets (currently only service role can)
DROP POLICY IF EXISTS "System can update wallets" ON public.wallets;
CREATE POLICY "Users can update their own wallets"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id);

-- 3. Fix transactions RLS: allow users to insert their own transactions
DROP POLICY IF EXISTS "System can manage transactions" ON public.transactions;
CREATE POLICY "System can manage transactions"
ON public.transactions FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id);
