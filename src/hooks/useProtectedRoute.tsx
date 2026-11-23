
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { devConsole } from "@/utils/consoleCleanup";

export const useProtectedRoute = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        // Demo mode: signed-out visitors use the local demo layer, so
        // protected pages stay reachable unless Supabase was forced on.
        const forcedSupabase = localStorage.getItem('palmtrader:backend') === 'supabase';
        if (!session && !forcedSupabase) {
          return;
        }

        if (!session) {
          // Store the current path in localStorage before redirecting
          localStorage.setItem('redirectAfterLogin', location.pathname);
          
          toast({
            title: "Authentication required",
            description: "Please sign in to access this feature",
          });
          
          navigate('/auth');
        }
      } catch (error) {
        devConsole.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, location.pathname, toast]);

  return { isLoading };
};
