-- Fix dangerous account_details INSERT policy: restrict from public to service_role
DROP POLICY IF EXISTS "Allow trigger to insert account details" ON public.account_details;
CREATE POLICY "Service role can insert account details"
ON public.account_details FOR INSERT TO service_role
WITH CHECK (true);

-- Remove duplicate market_data SELECT policy
DROP POLICY IF EXISTS "Public read access to market data" ON public.market_data;

-- Replace market_data blanket ALL with scoped write policies
DROP POLICY IF EXISTS "Service role full access to market data" ON public.market_data;
CREATE POLICY "Service role can write market data"
ON public.market_data FOR INSERT TO service_role
WITH CHECK (true);
CREATE POLICY "Service role can update market data"
ON public.market_data FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- Replace system_metrics blanket ALL with scoped policies
DROP POLICY IF EXISTS "Service role can manage system metrics" ON public.system_metrics;
CREATE POLICY "Service role can insert system metrics"
ON public.system_metrics FOR INSERT TO service_role
WITH CHECK (true);
CREATE POLICY "Service role can update system metrics"
ON public.system_metrics FOR UPDATE TO service_role
USING (true) WITH CHECK (true);
CREATE POLICY "Service role can select system metrics"
ON public.system_metrics FOR SELECT TO service_role
USING (true);

-- Admin view policy for system_metrics (drop first to avoid duplicate)
DROP POLICY IF EXISTS "Admins can view system metrics" ON public.system_metrics;
CREATE POLICY "Admins can view system metrics"
ON public.system_metrics FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
