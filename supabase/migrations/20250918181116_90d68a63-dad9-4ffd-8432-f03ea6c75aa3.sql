-- Fix search path security issue in cleanup function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;