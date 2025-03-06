import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { toast } from '@/components/ui/use-toast';

const Auth = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user has completed onboarding
        const { data, error } = await supabase
          .from('account_details')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching account details:', error);
          throw error;
        }

        // Check onboarding status and redirect accordingly
        if (!data?.onboarding_completed) {
          navigate('/onboarding');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  return (
    <div className="grid h-screen place-items-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>Sign in or sign up to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              style: {
                container: {
                  background: theme === 'dark' ? '#1f2937' : 'white',
                  borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                },
                anchor: {
                  color: theme === 'dark' ? '#9ca3af' : '#374151',
                },
                input: {
                  borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                  background: theme === 'dark' ? '#374151' : 'white',
                  color: theme === 'dark' ? '#9ca3af' : '#374151',
                },
                button: {
                  background: theme === 'dark' ? '#4f46e5' : '#4f46e5',
                  color: 'white',
                },
                label: {
                  color: theme === 'dark' ? '#9ca3af' : '#374151',
                },
              },
            }}
            providers={['google', 'github']}
            redirectTo="http://localhost:5173/"
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => toast({
            title: "Not implemented",
            description: "This feature is not implemented yet.",
          })}>Forgot Password</Button>
          <Button onClick={() => navigate('/')}>Skip</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
