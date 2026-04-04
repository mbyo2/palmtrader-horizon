
-- Storage policies for business-documents bucket
CREATE POLICY "Users can view own business documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'business-documents'
    AND EXISTS (
      SELECT 1 FROM public.local_businesses lb
      WHERE lb.id::text = (storage.foldername(name))[1]
        AND lb.submitted_by = auth.uid()
    )
  );

CREATE POLICY "Users can upload own business documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-documents'
    AND EXISTS (
      SELECT 1 FROM public.local_businesses lb
      WHERE lb.id::text = (storage.foldername(name))[1]
        AND lb.submitted_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all business documents"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'business-documents'
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'business-documents'
    AND public.is_admin(auth.uid())
  );
