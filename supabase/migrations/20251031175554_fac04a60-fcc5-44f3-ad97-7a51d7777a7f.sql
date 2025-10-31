-- Fix function search path mutable security warning
-- Drop trigger first, then function, then recreate both properly
DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
DROP FUNCTION IF EXISTS update_profiles_updated_at() CASCADE;

-- Recreate function with proper security settings
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();