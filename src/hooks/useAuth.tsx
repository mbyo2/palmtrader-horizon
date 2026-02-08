import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { UserInitService } from '@/services/UserInitService';

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

type AppRole = 'admin' | 'moderator' | 'user' | 'premium';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  accountDetails: AccountDetails | null;
  userRoles: AppRole[];
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  hasRole: (role: AppRole) => boolean;
  requireAuth: (callback: () => void) => void;
  refetchAccountDetails: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  accountDetails: null,
  userRoles: [],
  signOut: async () => {},
  isAdmin: () => false,
  hasRole: () => false,
  requireAuth: () => {},
  refetchAccountDetails: async () => {},
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
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
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

  const fetchUserRoles = async (userId: string) => {
    try {
      // Use the security definer function to get roles safely
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        setUserRoles(['user']); // Default to user role on error
        return;
      }

      if (data && data.length > 0) {
        setUserRoles(data.map(r => r.role as AppRole));
      } else {
        // If no roles found, user should have default 'user' role
        setUserRoles(['user']);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles(['user']);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer data loading to prevent auth deadlock
        setTimeout(() => {
          fetchAccountDetails(session.user.id);
          fetchUserRoles(session.user.id);
          // Initialize wallet for user on sign in
          if (event === 'SIGNED_IN') {
            UserInitService.initializeNewUser(
              session.user.id, 
              session.user.user_metadata as { first_name?: string; last_name?: string }
            );
          }
        }, 0);
      } else {
        setAccountDetails(null);
        setUserRoles([]);
      }
      setLoading(false);
    });

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAccountDetails(session.user.id);
        fetchUserRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setAccountDetails(null);
      setUserRoles([]);
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

  // Check admin status using the secure user_roles table
  const isAdmin = () => {
    return userRoles.includes('admin');
  };

  // Check if user has a specific role
  const hasRole = (role: AppRole) => {
    return userRoles.includes(role);
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

  const refetchAccountDetails = async () => {
    if (user) {
      await Promise.all([
        fetchAccountDetails(user.id),
        fetchUserRoles(user.id)
      ]);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      accountDetails,
      userRoles,
      signOut, 
      isAdmin,
      hasRole,
      requireAuth,
      refetchAccountDetails
    }}>
      {children}
    </AuthContext.Provider>
  );
};
