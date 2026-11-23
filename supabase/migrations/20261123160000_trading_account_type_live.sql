-- PalmCacia Alpaca wiring (2026-11-23): the alpaca-broker function's
-- onboarding path creates the user's linked trading account with
-- account_type 'live', but the trading_account_type enum had no 'live'
-- value (demo, cent, standard_stp, raw_ecn, pro_ecn, islamic), so the
-- insert failed and Alpaca accounts never linked. Additive only.
ALTER TYPE public.trading_account_type ADD VALUE IF NOT EXISTS 'live';
