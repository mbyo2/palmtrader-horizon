-- Create wallet balance update function
CREATE OR REPLACE FUNCTION public.update_wallet_balance(
  p_user_id UUID,
  p_currency TEXT,
  p_amount NUMERIC,
  p_operation TEXT
) RETURNS VOID AS $$
BEGIN
  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id, currency, available_balance)
  VALUES (p_user_id, p_currency, 0)
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Update balance based on operation
  IF p_operation = 'deposit' THEN
    UPDATE public.wallets 
    SET available_balance = available_balance + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id AND currency = p_currency;
  ELSIF p_operation = 'withdrawal' THEN
    UPDATE public.wallets 
    SET available_balance = available_balance + p_amount, -- p_amount is already negative
        updated_at = NOW()
    WHERE user_id = p_user_id AND currency = p_currency;
  ELSIF p_operation = 'reserve' THEN
    UPDATE public.wallets 
    SET available_balance = available_balance - ABS(p_amount),
        reserved_balance = reserved_balance + ABS(p_amount),
        updated_at = NOW()
    WHERE user_id = p_user_id AND currency = p_currency;
  ELSIF p_operation = 'release_reserve' THEN
    UPDATE public.wallets 
    SET available_balance = available_balance + ABS(p_amount),
        reserved_balance = reserved_balance - ABS(p_amount),
        updated_at = NOW()
    WHERE user_id = p_user_id AND currency = p_currency;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;