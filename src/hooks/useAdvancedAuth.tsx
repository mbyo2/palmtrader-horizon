
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { AuthService, UserProfile, UserPreferences } from "@/services/AuthService";
import { toast } from "sonner";

export const useAdvancedAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile and preferences loading
          setTimeout(async () => {
            const userProfile = await AuthService.getProfile(session.user.id);
            const userPreferences = await AuthService.getPreferences(session.user.id);
            setProfile(userProfile);
            setPreferences(userPreferences);
          }, 0);
        } else {
          setProfile(null);
          setPreferences(null);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  }) => {
    const result = await AuthService.signUp(email, password, userData);
    if (result.success) {
      toast.success("Account created successfully! Please check your email to verify your account.");
    } else {
      toast.error(result.error || "Sign up failed");
    }
    return result;
  };

  const signIn = async (email: string, password: string) => {
    const result = await AuthService.signIn(email, password);
    if (result.success) {
      toast.success("Signed in successfully!");
      navigate('/');
    } else {
      toast.error(result.error || "Sign in failed");
    }
    return result;
  };

  const signOut = async () => {
    const result = await AuthService.signOut();
    if (result.success) {
      toast.success("Signed out successfully");
      navigate('/auth');
    } else {
      toast.error(result.error || "Sign out failed");
    }
    return result;
  };

  const resetPassword = async (email: string) => {
    const result = await AuthService.resetPassword(email);
    if (result.success) {
      toast.success("Password reset email sent! Check your inbox.");
    } else {
      toast.error(result.error || "Password reset failed");
    }
    return result;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { success: false, error: "User not authenticated" };
    
    const result = await AuthService.updateProfile(user.id, updates);
    if (result.success) {
      // Refresh profile data
      const updatedProfile = await AuthService.getProfile(user.id);
      setProfile(updatedProfile);
      toast.success("Profile updated successfully!");
    } else {
      toast.error(result.error || "Profile update failed");
    }
    return result;
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user) return { success: false, error: "User not authenticated" };
    
    const result = await AuthService.updatePreferences(user.id, updates);
    if (result.success) {
      // Refresh preferences data
      const updatedPreferences = await AuthService.getPreferences(user.id);
      setPreferences(updatedPreferences);
      toast.success("Preferences updated successfully!");
    } else {
      toast.error(result.error || "Preferences update failed");
    }
    return result;
  };

  const startKYC = async (documents: { idDocument: File; proofOfAddress: File }) => {
    if (!user) return { success: false, error: "User not authenticated" };
    
    const result = await AuthService.startKYCProcess(user.id, documents);
    if (result.success) {
      toast.success("KYC verification started! We'll review your documents within 2-3 business days.");
      // Refresh profile to show updated KYC status
      const updatedProfile = await AuthService.getProfile(user.id);
      setProfile(updatedProfile);
    } else {
      toast.error(result.error || "KYC process failed");
    }
    return result;
  };

  const requireAuth = (callback: () => void) => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate('/auth');
      return;
    }
    callback();
  };

  const requireVerification = (callback: () => void) => {
    requireAuth(() => {
      if (profile?.kyc_status !== 'approved') {
        toast.error("Please complete account verification to access this feature");
        navigate('/verify');
        return;
      }
      callback();
    });
  };

  const isPremium = () => profile?.role === 'premium' || profile?.role === 'admin';
  const isAdmin = () => profile?.role === 'admin';
  const isActive = () => profile?.account_status === 'active';
  const isKycApproved = () => profile?.kyc_status === 'approved';
  const isEmailVerified = () => profile?.is_email_verified === true;
  const isPhoneVerified = () => profile?.is_phone_verified === true;

  return {
    user,
    session,
    profile,
    preferences,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    updatePreferences,
    startKYC,
    requireAuth,
    requireVerification,
    isPremium,
    isAdmin,
    isActive,
    isKycApproved,
    isEmailVerified,
    isPhoneVerified
  };
};
