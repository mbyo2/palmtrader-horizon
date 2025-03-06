
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface AccountDetails {
  role: 'basic' | 'premium' | 'admin';
  account_status: 'pending' | 'active' | 'restricted' | 'suspended';
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected';
  onboarding_completed?: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data, error } = await supabase
            .from('account_details')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) throw error;
          setAccountDetails(data);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data, error } = await supabase
          .from('account_details')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error('Error fetching account details:', error);
        } else {
          setAccountDetails(data);
        }
      } else {
        setAccountDetails(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      navigate('/auth');
    }
  };

  const isPremium = () => accountDetails?.role === 'premium';
  const isAdmin = () => accountDetails?.role === 'admin';
  const isActive = () => accountDetails?.account_status === 'active';
  const isKycApproved = () => accountDetails?.kyc_status === 'approved';

  const requireAuth = (callback: () => void) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    callback();
  };

  const requirePremium = (callback: () => void) => {
    requireAuth(() => {
      if (!isPremium()) {
        navigate('/upgrade');
        return;
      }
      callback();
    });
  };

  const requireActive = (callback: () => void) => {
    requireAuth(() => {
      if (!isActive()) {
        navigate('/verify');
        return;
      }
      callback();
    });
  };

  return {
    user,
    accountDetails,
    loading,
    isPremium,
    isAdmin,
    isActive,
    isKycApproved,
    requireAuth,
    requirePremium,
    requireActive,
    signOut,
  };
};
