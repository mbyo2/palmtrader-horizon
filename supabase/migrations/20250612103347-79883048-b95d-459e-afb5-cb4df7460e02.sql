
-- Create mobile money accounts table
CREATE TABLE public.mobile_money_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, phone_number, provider)
);

-- Create mobile money transactions table
CREATE TABLE public.mobile_money_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.mobile_money_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  fees NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  external_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on mobile money accounts
ALTER TABLE public.mobile_money_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mobile money accounts
CREATE POLICY "Users can view their own mobile money accounts" 
  ON public.mobile_money_accounts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mobile money accounts" 
  ON public.mobile_money_accounts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mobile money accounts" 
  ON public.mobile_money_accounts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mobile money accounts" 
  ON public.mobile_money_accounts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable RLS on mobile money transactions
ALTER TABLE public.mobile_money_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mobile money transactions
CREATE POLICY "Users can view their own mobile money transactions" 
  ON public.mobile_money_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mobile money transactions" 
  ON public.mobile_money_transactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mobile money transactions" 
  ON public.mobile_money_transactions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_mobile_money_accounts_user_id ON public.mobile_money_accounts(user_id);
CREATE INDEX idx_mobile_money_accounts_provider ON public.mobile_money_accounts(provider);
CREATE INDEX idx_mobile_money_transactions_user_id ON public.mobile_money_transactions(user_id);
CREATE INDEX idx_mobile_money_transactions_account_id ON public.mobile_money_transactions(account_id);
CREATE INDEX idx_mobile_money_transactions_status ON public.mobile_money_transactions(status);
