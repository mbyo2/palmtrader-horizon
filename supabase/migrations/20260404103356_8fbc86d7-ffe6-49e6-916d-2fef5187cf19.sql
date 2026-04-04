
-- 1. CONSOLIDATE ADMIN CHECKS: Replace account_details.role checks with is_admin() from user_roles

DROP POLICY IF EXISTS "Admins can manage account type configs" ON public.account_type_configs;
CREATE POLICY "Admins can manage account type configs"
  ON public.account_type_configs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can do everything" ON public.business_documents;
CREATE POLICY "Admins can do everything"
  ON public.business_documents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update compliance events" ON public.compliance_events;
DROP POLICY IF EXISTS "Admins can view all compliance events" ON public.compliance_events;

DROP POLICY IF EXISTS "Admins can create compliance reports" ON public.compliance_reports;
CREATE POLICY "Admins can create compliance reports"
  ON public.compliance_reports FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update compliance reports" ON public.compliance_reports;
CREATE POLICY "Admins can update compliance reports"
  ON public.compliance_reports FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all compliance reports" ON public.compliance_reports;
CREATE POLICY "Admins can view all compliance reports"
  ON public.compliance_reports FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can do everything" ON public.local_businesses;
CREATE POLICY "Admins can do everything"
  ON public.local_businesses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update suspicious activities" ON public.suspicious_activities;
CREATE POLICY "Admins can update suspicious activities"
  ON public.suspicious_activities FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all suspicious activities" ON public.suspicious_activities;
CREATE POLICY "Admins can view all suspicious activities"
  ON public.suspicious_activities FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all payment logs" ON public.payment_logs;
CREATE POLICY "Admins can view all payment logs"
  ON public.payment_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update logs" ON public.system_logs;
CREATE POLICY "Admins can update logs"
  ON public.system_logs FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
CREATE POLICY "Admins can view system logs"
  ON public.system_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all trading accounts" ON public.trading_accounts;
CREATE POLICY "Admins can manage all trading accounts"
  ON public.trading_accounts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update any account details" ON public.account_details;
CREATE POLICY "Admins can update any account details"
  ON public.account_details FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all account details" ON public.account_details;
CREATE POLICY "Admins can view all account details"
  ON public.account_details FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. FIX COMMENTS: Hide moderation_notes from non-admins
DROP POLICY IF EXISTS "Users can view public comments without moderation data" ON public.comments;
CREATE POLICY "Users can view unflagged comments"
  ON public.comments FOR SELECT TO public
  USING (
    (flagged = false OR flagged IS NULL)
    OR auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND flagged = (SELECT c.flagged FROM public.comments c WHERE c.id = comments.id)
    AND moderation_notes IS NOT DISTINCT FROM (SELECT c.moderation_notes FROM public.comments c WHERE c.id = comments.id)
  );

CREATE POLICY "Admins can manage all comments"
  ON public.comments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3. TIGHTEN system_logs and payment_logs INSERT to service_role only
DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;
CREATE POLICY "System can insert logs"
  ON public.system_logs FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert payment logs" ON public.payment_logs;
CREATE POLICY "Service role can insert payment logs"
  ON public.payment_logs FOR INSERT TO service_role
  WITH CHECK (true);

-- 4. Remove old account_details-based storage policy
DROP POLICY IF EXISTS "Admins can access all documents" ON storage.objects;
