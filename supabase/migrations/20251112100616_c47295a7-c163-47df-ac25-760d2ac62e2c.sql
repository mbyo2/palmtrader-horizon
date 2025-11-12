-- Create compliance reports table
CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('aml', 'kyc_audit', 'suspicious_activity', 'transaction_monitoring', 'regulatory_filing')),
  report_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  report_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  generated_by UUID REFERENCES auth.users(id) NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  total_items INTEGER DEFAULT 0,
  flagged_items INTEGER DEFAULT 0,
  critical_items INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'submitted', 'archived')),
  submitted_to TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create suspicious activities table
CREATE TABLE IF NOT EXISTS public.suspicious_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('unusual_transaction', 'high_frequency', 'large_amount', 'geographic_anomaly', 'pattern_match', 'kyc_mismatch', 'sanctions_hit', 'pep_match')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  related_transaction_id UUID,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'cleared', 'escalated', 'reported')),
  assigned_to UUID REFERENCES auth.users(id),
  investigated_by UUID REFERENCES auth.users(id),
  investigation_notes TEXT,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  reported_to_authorities BOOLEAN DEFAULT FALSE,
  report_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create compliance events table
CREATE TABLE IF NOT EXISTS public.compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('kyc_submitted', 'kyc_approved', 'kyc_rejected', 'aml_check', 'transaction_flagged', 'limit_exceeded', 'document_uploaded', 'verification_completed')),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_reports (Admin only)
CREATE POLICY "Admins can view all compliance reports"
  ON public.compliance_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_details
      WHERE id = auth.uid() AND role = 'admin'::account_role
    )
  );

CREATE POLICY "Admins can create compliance reports"
  ON public.compliance_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_details
      WHERE id = auth.uid() AND role = 'admin'::account_role
    )
  );

CREATE POLICY "Admins can update compliance reports"
  ON public.compliance_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_details
      WHERE id = auth.uid() AND role = 'admin'::account_role
    )
  );

-- RLS Policies for suspicious_activities (Admin only)
CREATE POLICY "Admins can view all suspicious activities"
  ON public.suspicious_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_details
      WHERE id = auth.uid() AND role = 'admin'::account_role
    )
  );

CREATE POLICY "System can create suspicious activities"
  ON public.suspicious_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update suspicious activities"
  ON public.suspicious_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_details
      WHERE id = auth.uid() AND role = 'admin'::account_role
    )
  );

-- RLS Policies for compliance_events
CREATE POLICY "Admins can view all compliance events"
  ON public.compliance_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_details
      WHERE id = auth.uid() AND role = 'admin'::account_role
    )
  );

CREATE POLICY "System can create compliance events"
  ON public.compliance_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update compliance events"
  ON public.compliance_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_details
      WHERE id = auth.uid() AND role = 'admin'::account_role
    )
  );

-- Create indexes for performance
CREATE INDEX idx_compliance_reports_type ON public.compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_status ON public.compliance_reports(status);
CREATE INDEX idx_compliance_reports_period ON public.compliance_reports(report_period_start, report_period_end);
CREATE INDEX idx_suspicious_activities_user ON public.suspicious_activities(user_id);
CREATE INDEX idx_suspicious_activities_status ON public.suspicious_activities(status);
CREATE INDEX idx_suspicious_activities_severity ON public.suspicious_activities(severity);
CREATE INDEX idx_compliance_events_user ON public.compliance_events(user_id);
CREATE INDEX idx_compliance_events_type ON public.compliance_events(event_type);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_compliance_reports_updated_at
  BEFORE UPDATE ON public.compliance_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suspicious_activities_updated_at
  BEFORE UPDATE ON public.suspicious_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_events_updated_at
  BEFORE UPDATE ON public.compliance_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();