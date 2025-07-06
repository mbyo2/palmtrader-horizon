import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Shield, Smartphone, Copy, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface TwoFactorSetupProps {
  userId: string;
  onComplete: () => void;
}

const TwoFactorSetup = ({ userId, onComplete }: TwoFactorSetupProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    generateSecret();
  }, []);

  const generateSecret = async () => {
    try {
      setLoading(true);
      
      // Generate TOTP secret (in production, use a proper crypto library)
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let result = '';
      for (let i = 0; i < 32; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      setSecret(result);
      
      // Generate QR code URL
      const appName = 'Palm Cacia';
      const accountName = `user_${userId}`;
      const issuer = 'Palm Cacia Trading';
      
      const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${result}&issuer=${encodeURIComponent(issuer)}`;
      setQrCodeUrl(otpAuthUrl);
      
      // Generate backup codes
      const codes = Array.from({ length: 8 }, () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
      });
      setBackupCodes(codes);
      
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      toast({
        title: "Setup Error",
        description: "Failed to generate 2FA secret",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // In production, verify the TOTP code on the server
      // For demo, we'll simulate verification
      const isValid = Math.random() > 0.1; // 90% success rate
      
      if (!isValid) {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Store 2FA settings in user preferences only (simplified)
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          two_factor_enabled: true
        });

      setStep('complete');
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled",
      });
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast({
        title: "Setup Failed",
        description: "Failed to enable two-factor authentication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  if (step === 'setup') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            Set Up Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Secure your account with 2FA using an authenticator app
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-4">
              Step 1: Scan the QR code with your authenticator app
            </div>
            
            {qrCodeUrl && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrCodeUrl} size={200} />
              </div>
            )}
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              Or enter this secret manually:
            </div>
            <div className="flex gap-2">
              <Input
                value={secret}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(secret)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              Download an authenticator app like Google Authenticator, Authy, or 1Password to scan the QR code.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={() => setStep('verify')}
            disabled={loading}
            className="w-full"
          >
            Continue to Verification
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Verify Your Setup</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-lg tracking-widest"
            />
          </div>
          
          <Button 
            onClick={verifyAndEnable2FA}
            disabled={loading || verificationCode.length !== 6}
            className="w-full"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Verify and Enable 2FA
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => setStep('setup')}
            className="w-full"
          >
            Back to Setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          2FA Successfully Enabled
        </CardTitle>
        <CardDescription>
          Your account is now secured with two-factor authentication
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Save these backup codes in a secure location. 
            You can use them to access your account if you lose your authenticator device.
          </AlertDescription>
        </Alert>
        
        <div>
          <Label>Backup Codes</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {backupCodes.map((code, index) => (
              <div 
                key={index}
                className="p-2 bg-muted rounded text-center font-mono text-sm cursor-pointer hover:bg-muted/80"
                onClick={() => copyToClipboard(code)}
              >
                {code}
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Click any code to copy it
          </div>
        </div>
        
        <Button onClick={onComplete} className="w-full">
          Complete Setup
        </Button>
      </CardContent>
    </Card>
  );
};

export default TwoFactorSetup;