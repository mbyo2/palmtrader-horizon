import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

interface PasswordResetProps {
  onBack: () => void;
}

const PasswordReset = ({ onBack }: PasswordResetProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'sent'>('request');

  const handleRequestReset = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      setStep('sent');
      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions",
      });
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Mail className="h-5 w-5" />
          Password Reset
        </CardTitle>
        <CardDescription>
          {step === 'request' 
            ? "Enter your email to receive reset instructions"
            : "Reset instructions have been sent to your email"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {step === 'request' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <Button 
              onClick={handleRequestReset}
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Reset Email
            </Button>
          </>
        ) : (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              We've sent password reset instructions to <strong>{email}</strong>. 
              Please check your email and follow the link to reset your password.
            </AlertDescription>
          </Alert>
        )}
        
        <Button variant="ghost" onClick={onBack} className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Button>
      </CardContent>
    </Card>
  );
};

export default PasswordReset;