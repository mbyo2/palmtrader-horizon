-- Fix infinite recursion in account_details policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all account details" ON public.account_details;
DROP POLICY IF EXISTS "Admins can update any account details" ON public.account_details;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  -- Direct query to avoid recursion
  RETURN (
    SELECT role::text 
    FROM public.account_details 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create new policies using the security definer function
CREATE POLICY "Admins can view all account details" 
ON public.account_details 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update any account details" 
ON public.account_details 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');