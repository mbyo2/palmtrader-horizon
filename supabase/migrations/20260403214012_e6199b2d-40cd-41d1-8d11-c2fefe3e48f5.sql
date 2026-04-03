
-- 1. Fix account_details privilege escalation
DROP POLICY IF EXISTS "Users can update own account details" ON public.account_details;

CREATE POLICY "Users can update own account details"
  ON public.account_details
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT ad.role FROM public.account_details ad WHERE ad.id = auth.uid())
    AND account_status = (SELECT ad.account_status FROM public.account_details ad WHERE ad.id = auth.uid())
    AND kyc_status = (SELECT ad.kyc_status FROM public.account_details ad WHERE ad.id = auth.uid())
  );

-- 2. Fix market_news INSERT policy (restrict to service_role only)
DROP POLICY IF EXISTS "Service role can insert market news" ON public.market_news;

CREATE POLICY "Service role can insert market news"
  ON public.market_news
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also drop the duplicate SELECT policy if it exists from previous migration
DROP POLICY IF EXISTS "Anyone can read market news" ON public.market_news;

CREATE POLICY "Anyone can read market news"
  ON public.market_news
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 3. Fix KYC storage policies
DROP POLICY IF EXISTS "Admin can manage all KYC documents" ON storage.objects;

CREATE POLICY "Users can view own KYC documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own KYC documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can manage all KYC documents"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND public.is_admin(auth.uid())
  );
