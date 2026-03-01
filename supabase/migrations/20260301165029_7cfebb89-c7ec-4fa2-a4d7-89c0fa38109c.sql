
-- Drop restrictive policies that require active status
DROP POLICY IF EXISTS "Active users can trade" ON public.trades;
DROP POLICY IF EXISTS "Active users can manage portfolio" ON public.portfolio;

-- Add delete policy for trades (for cancellations)
CREATE POLICY "Users can delete their own trades"
ON public.trades FOR DELETE
USING (auth.uid() = user_id);

-- Add update policy for trades
CREATE POLICY "Users can update their own trades"
ON public.trades FOR UPDATE
USING (auth.uid() = user_id);

-- Add delete policy for portfolio
CREATE POLICY "Users can delete their portfolio"
ON public.portfolio FOR DELETE
USING (auth.uid() = user_id);

-- Activate all pending users so they can trade immediately
UPDATE public.account_details SET account_status = 'active' WHERE account_status = 'pending';
