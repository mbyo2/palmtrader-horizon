
-- Fix overly-permissive RLS policies that apply USING(true)/WITH CHECK(true) to {public}
-- These should be scoped to service_role or use proper admin checks

-- 1. compliance_events: 'Admin can manage compliance events' (ALL, public, true) → scope to admin
DROP POLICY IF EXISTS "Admin can manage compliance events" ON public.compliance_events;
CREATE POLICY "Admin can manage compliance events" ON public.compliance_events
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 2. compliance_events: 'System can create compliance events' (INSERT, authenticated, true) → scope to admin
DROP POLICY IF EXISTS "System can create compliance events" ON public.compliance_events;
CREATE POLICY "System can create compliance events" ON public.compliance_events
  AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

-- 3. kyc_verifications: 'System can update KYC verifications' (ALL, public, true) → service_role
DROP POLICY IF EXISTS "System can update KYC verifications" ON public.kyc_verifications;
CREATE POLICY "System can update KYC verifications" ON public.kyc_verifications
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. kyc_documents: 'Admin can manage all KYC documents' (ALL, public, true) → admin check
DROP POLICY IF EXISTS "Admin can manage all KYC documents" ON public.kyc_documents;
CREATE POLICY "Admin can manage all KYC documents" ON public.kyc_documents
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 5. tax_documents: 'System can manage tax documents' (ALL, public, true) → service_role
DROP POLICY IF EXISTS "System can manage tax documents" ON public.tax_documents;
CREATE POLICY "System can manage tax documents" ON public.tax_documents
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. market_data: 'Service role full access to market data' (ALL, public, true) → service_role
DROP POLICY IF EXISTS "Service role full access to market data" ON public.market_data;
CREATE POLICY "Service role full access to market data" ON public.market_data
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. transactions: 'System can manage transactions' (ALL, public, true) → service_role
DROP POLICY IF EXISTS "System can manage transactions" ON public.transactions;
CREATE POLICY "System can manage transactions" ON public.transactions
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. rate_limits: 'Service role can manage rate limits' (ALL, public, true) → service_role
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 9. system_metrics: 'Service role can manage system metrics' (ALL, public, true) → service_role
DROP POLICY IF EXISTS "Service role can manage system metrics" ON public.system_metrics;
CREATE POLICY "Service role can manage system metrics" ON public.system_metrics
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 10. storage_access_logs: 'Service role can manage storage logs' (ALL, public, true) → service_role
DROP POLICY IF EXISTS "Service role can manage storage logs" ON public.storage_access_logs;
CREATE POLICY "Service role can manage storage logs" ON public.storage_access_logs
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 11. order_history: 'System can insert order history' (INSERT, public, true) → service_role
DROP POLICY IF EXISTS "System can insert order history" ON public.order_history;
CREATE POLICY "System can insert order history" ON public.order_history
  AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

-- Also allow authenticated users to insert their own order history
CREATE POLICY "Users can insert own order history" ON public.order_history
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 12. payment_logs: 'Service role can insert payment logs' (INSERT, public, true) → service_role
DROP POLICY IF EXISTS "Service role can insert payment logs" ON public.payment_logs;
CREATE POLICY "Service role can insert payment logs" ON public.payment_logs
  AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

-- 13. system_logs: 'System can insert logs' (INSERT, public, true) → service_role
DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;
CREATE POLICY "System can insert logs" ON public.system_logs
  AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

-- 14. copy_trading_trades: 'System can insert copy trades' (INSERT, public, true) → service_role
DROP POLICY IF EXISTS "System can insert copy trades" ON public.copy_trading_trades;
CREATE POLICY "System can insert copy trades" ON public.copy_trading_trades
  AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

-- 15. suspicious_activities: 'System can create suspicious activities' (INSERT, authenticated, true) → admin/service_role
DROP POLICY IF EXISTS "System can create suspicious activities" ON public.suspicious_activities;
CREATE POLICY "System can create suspicious activities" ON public.suspicious_activities
  AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

-- Allow admin to insert suspicious activities too
CREATE POLICY "Admins can create suspicious activities" ON public.suspicious_activities
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));
