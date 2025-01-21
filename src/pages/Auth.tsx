import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      if (event === "SIGNED_IN") {
        // Fetch account details after sign in
        const { data: accountDetails, error } = await supabase
          .from('account_details')
          .select('*')
          .eq('id', session?.user?.id)
          .single();

        if (error) {
          console.error("Error fetching account details:", error);
          toast({
            title: "Error",
            description: "Failed to fetch account details",
            variant: "destructive",
          });
          return;
        }

        console.log("Account details:", accountDetails);

        // Show welcome message based on account status
        if (accountDetails.account_status === 'pending') {
          toast({
            title: "Welcome!",
            description: "Your account is pending verification. Some features may be limited.",
          });
        } else if (accountDetails.account_status === 'active') {
          toast({
            title: "Welcome back!",
            description: accountDetails.role === 'premium' 
              ? "Premium features are available" 
              : "Logged in successfully",
          });
        }

        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold gradient-text">Welcome to PalmCacia</h2>
          <p className="mt-2 text-muted-foreground">
            Sign in to access your trading account
          </p>
        </div>
        
        <SupabaseAuth 
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'rgb(var(--primary))',
                  brandAccent: 'rgb(var(--primary))',
                },
              },
            },
            className: {
              container: 'space-y-4',
              button: 'w-full',
              label: 'text-foreground',
              input: 'bg-background border-border',
            },
          }}
          theme={theme === "dark" ? "dark" : "light"}
          providers={["google", "github"]}
          redirectTo={window.location.origin}
        />
        
        <div className="text-center text-sm text-muted-foreground">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </Card>
    </div>
  );
};

export default Auth;