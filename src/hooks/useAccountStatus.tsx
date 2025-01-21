import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface AccountDetails {
  role: 'basic' | 'premium' | 'admin';
  account_status: 'pending' | 'active' | 'restricted' | 'suspended';
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected';
}

export const useAccountStatus = () => {
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountDetails();
  }, []);

  const fetchAccountDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccountDetails(null);
        return;
      }

      const { data, error } = await supabase
        .from('account_details')
        .select('role, account_status, kyc_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setAccountDetails(data);
    } catch (error) {
      console.error('Error fetching account details:', error);
      setAccountDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = () => accountDetails?.role === 'premium';
  const isActive = () => accountDetails?.account_status === 'active';
  const isPending = () => accountDetails?.account_status === 'pending';
  const isRestricted = () => accountDetails?.account_status === 'restricted';
  const isSuspended = () => accountDetails?.account_status === 'suspended';

  return {
    accountDetails,
    loading,
    isPremium,
    isActive,
    isPending,
    isRestricted,
    isSuspended,
    refresh: fetchAccountDetails,
  };
};