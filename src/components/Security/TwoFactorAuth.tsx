
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Smartphone, Key, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const TwoFactorAuth = () => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateQRCode = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would call your backend to generate a TOTP secret
      // and return a QR code URL
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      setQrCode(data.qrCodeUrl);
      setStep('verify');
    } catch (error) {
      toast.error('Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      });

      const data = await response.json();
      
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setIsEnabled(true);
        setStep('complete');
        toast.success('Two-factor authentication enabled successfully');
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const disable2FA = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setIsEnabled(false);
        setStep('setup');
        setQrCode('');
        setVerificationCode('');
        setBackupCodes([]);
        toast.success('Two-factor authentication disabled');
      } else {
        toast.error('Failed to disable 2FA');
      }
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      setBackupCodes(data.backupCodes);
      toast.success('New backup codes generated');
    } catch (error) {
      toast.error('Failed to generate backup codes');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Two-Factor Authentication
            <Badge variant="default" className="bg-green-500">Enabled</Badge>
          </CardTitle>
          <CardDescription>
            Your account is protected with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            2FA is active and protecting your account
          </div>

          {backupCodes.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Backup Codes</h4>
              <p className="text-sm text-muted-foreground">
                Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-center">{code}</div>
                ))}
              </div>
              <Button variant="outline" onClick={regenerateBackupCodes} disabled={isLoading}>
                <Key className="h-4 w-4 mr-2" />
                Generate New Backup Codes
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="destructive" onClick={disable2FA} disabled={isLoading}>
              Disable 2FA
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
          <Badge variant="secondary">Disabled</Badge>
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'setup' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Two-factor authentication adds an extra layer of security to your account by requiring a code from your phone in addition to your password.
            </div>
            <Button onClick={generateQRCode} disabled={isLoading}>
              <Smartphone className="h-4 w-4 mr-2" />
              Set Up 2FA
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Scan QR Code</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {qrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">2. Enter Verification Code</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Enter the 6-digit code from your authenticator app
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="font-mono text-center"
                />
                <Button onClick={verifyAndEnable} disabled={isLoading || verificationCode.length !== 6}>
                  Verify & Enable
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">2FA Successfully Enabled!</span>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Backup Codes</h4>
              <p className="text-sm text-muted-foreground">
                Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-center">{code}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorAuth;
