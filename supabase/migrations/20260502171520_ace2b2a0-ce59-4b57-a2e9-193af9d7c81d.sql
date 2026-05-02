
-- Encrypted master seeds (one per user). Backend-only access.
CREATE TABLE public.crypto_wallet_seeds (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_seed TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crypto_wallet_seeds ENABLE ROW LEVEL SECURITY;
-- No policies = no client access. Service role bypasses RLS.

-- Generated deposit addresses
CREATE TABLE public.crypto_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  derivation_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency, network)
);
CREATE INDEX idx_crypto_addresses_user ON public.crypto_addresses(user_id);
CREATE INDEX idx_crypto_addresses_address ON public.crypto_addresses(address);
ALTER TABLE public.crypto_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own addresses" ON public.crypto_addresses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all addresses" ON public.crypto_addresses
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Deposits
CREATE TABLE public.crypto_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  amount NUMERIC(36, 18) NOT NULL,
  confirmations INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (currency, network, tx_hash)
);
CREATE INDEX idx_crypto_deposits_user ON public.crypto_deposits(user_id);
ALTER TABLE public.crypto_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own deposits" ON public.crypto_deposits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all deposits" ON public.crypto_deposits
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_crypto_deposits_updated
  BEFORE UPDATE ON public.crypto_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Withdrawals
CREATE TABLE public.crypto_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  network TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount NUMERIC(36, 18) NOT NULL,
  fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  broadcast_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crypto_withdrawals_user ON public.crypto_withdrawals(user_id);
ALTER TABLE public.crypto_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own withdrawals" ON public.crypto_withdrawals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own withdrawals" ON public.crypto_withdrawals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all withdrawals" ON public.crypto_withdrawals
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_crypto_withdrawals_updated
  BEFORE UPDATE ON public.crypto_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
