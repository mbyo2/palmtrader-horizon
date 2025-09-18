-- Create additional infrastructure tables for comprehensive monitoring
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on metrics table
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage metrics
CREATE POLICY "Service role can manage system metrics" ON public.system_metrics FOR ALL USING (true);

-- Allow admins to view metrics
CREATE POLICY "Admins can view system metrics" ON public.system_metrics FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.account_details 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(endpoint, user_id, ip_address, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage rate limits
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits FOR ALL USING (true);

-- Create payment processing logs
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payment logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment logs
CREATE POLICY "Users can view own payment logs" ON public.payment_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Service role can insert payment logs
CREATE POLICY "Service role can insert payment logs" ON public.payment_logs FOR INSERT 
WITH CHECK (true);

-- Admins can view all payment logs
CREATE POLICY "Admins can view all payment logs" ON public.payment_logs FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.account_details 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Create storage access logs
CREATE TABLE IF NOT EXISTS public.storage_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  bucket_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  action TEXT NOT NULL, -- 'upload', 'download', 'delete'
  file_size BIGINT,
  content_type TEXT,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on storage logs
ALTER TABLE public.storage_access_logs ENABLE ROW LEVEL SECURITY;

-- Service role can manage storage logs
CREATE POLICY "Service role can manage storage logs" ON public.storage_access_logs FOR ALL USING (true);

-- Create function to clean up old logs
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Clean up rate limits older than 24 hours
  DELETE FROM public.rate_limits 
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  -- Clean up old system logs (keep last 30 days)
  DELETE FROM public.system_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Clean up old storage access logs (keep last 7 days)
  DELETE FROM public.storage_access_logs 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Clean up old payment logs (keep last 90 days)
  DELETE FROM public.payment_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_timestamp ON public.system_metrics(metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint_expires ON public.rate_limits(endpoint, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_created ON public.payment_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_logs_created ON public.storage_access_logs(created_at DESC);

-- Add missing wallet balance calculation
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS total_balance NUMERIC GENERATED ALWAYS AS (available_balance + reserved_balance) STORED;