-- Create wallets table for real balance tracking
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  available_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  reserved_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_balance NUMERIC(15,2) GENERATED ALWAYS AS (available_balance + reserved_balance) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own wallets" 
ON public.wallets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets" 
ON public.wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update wallets" 
ON public.wallets 
FOR UPDATE 
USING (true);

-- Create trigger for timestamps
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create system_logs table for real monitoring
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for system logs (admin only)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system logs" 
ON public.system_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM account_details 
  WHERE id = auth.uid() AND role = 'admin'::account_role
));

CREATE POLICY "System can insert logs" 
ON public.system_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update logs" 
ON public.system_logs 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM account_details 
  WHERE id = auth.uid() AND role = 'admin'::account_role
));

-- Initialize default USD wallet for existing users
INSERT INTO public.wallets (user_id, currency, available_balance)
SELECT id, 'USD', 10000.00
FROM account_details
WHERE id NOT IN (SELECT user_id FROM public.wallets WHERE currency = 'USD');