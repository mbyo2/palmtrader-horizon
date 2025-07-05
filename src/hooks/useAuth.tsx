
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface AccountDetails {
  role: 'basic' | 'premium' | 'admin';
  account_status: 'pending' | 'active' | 'restricted' | 'suspended';
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected';
  onboarding_completed?: boolean;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  date_of_birth?: string;
  tax_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  accountDetails: AccountDetails | null;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  requireAuth: (callback: () => void) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  accountDetails: null,
  signOut: async () => {},
  isAdmin: () => false,
  requireAuth: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAccountDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('account_details')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setAccountDetails(data);
    } catch (error) {
      console.error('Error fetching account details:', error);
      setAccountDetails(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchAccountDetails(session.user.id);
        }, 0);
      } else {
        setAccountDetails(null);
      }
      setLoading(false);
    });

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAccountDetails(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setAccountDetails(null);
      navigate('/');
      toast({
        title: 'Signed out successfully',
        description: 'You have been signed out of your account.',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error signing out',
        description: 'There was a problem signing out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const isAdmin = () => {
    return accountDetails?.role === 'admin';
  };

  const requireAuth = (callback: () => void) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to continue.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    callback();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      accountDetails,
      signOut, 
      isAdmin,
      requireAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};
