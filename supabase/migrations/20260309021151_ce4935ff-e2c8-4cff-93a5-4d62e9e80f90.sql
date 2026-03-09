ALTER TABLE public.account_details 
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS address text;