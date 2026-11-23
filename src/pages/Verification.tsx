import { useEffect, useState } from 'react';
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import KYCVerificationFlow from "@/components/KYC/KYCVerificationFlow";
import { InhouseKYCService, type KYCApplication } from "@/services/InhouseKYCService";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Phone,
  Mail
} from "lucide-react";

/**
 * /verification — account verification hub. Identity verification is
 * PalmCacia's own in-house flow (NRC/Passport photo + live selfie, human
 * review); email and phone checks live alongside it here.
 */
const Verification = () => {
  const { isLoading } = useProtectedRoute();
  const { user, accountDetails } = useAuth();
  const { toast } = useToast();
  const [application, setApplication] = useState<KYCApplication | null>(null);

  useEffect(() => {
    if (!user) return;
    InhouseKYCService.getMyLatestApplication(user.id)
      .then(setApplication)
      .catch(() => setApplication(null));
  }, [user]);

  const sendVerificationEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user?.email || ''
      });
      if (error) throw error;
      toast({
        title: "Verification email sent",
        description: "Please check your email and click the verification link.",
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast({
        title: "Failed to send email",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  const identityStatus = application?.status ?? (accountDetails?.kyc_status === 'approved' ? 'approved' : undefined);
  const kycProgress = identityStatus === 'approved' ? 100 : identityStatus === 'pending' ? 75 : 25;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Account Verification</h1>
          <p className="text-muted-foreground">Complete your verification to unlock all features</p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Progress</CardTitle>
          <CardDescription>
            Complete all steps to fully verify your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Identity verification</span>
              <span className="text-sm text-muted-foreground">{kycProgress}%</span>
            </div>
            <Progress value={kycProgress} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Email & Phone Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium break-all">{user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  {accountDetails?.is_email_verified ? 'Verified' : 'Verification required'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {accountDetails?.is_email_verified ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-gain" />
                    <Badge variant="success">Verified</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <Button size="sm" onClick={sendVerificationEmail}>
                      Send Verification Email
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{accountDetails?.phone_number || 'No phone number'}</p>
                <p className="text-sm text-muted-foreground">
                  {accountDetails?.is_phone_verified ? 'Verified' : 'Verification required'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {accountDetails?.is_phone_verified ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-gain" />
                    <Badge variant="success">Verified</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <Button size="sm" disabled title="Phone verification arrives with SMS provider setup">
                      Verify Phone
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Identity Verification — in-house KYC */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Identity Verification
          </CardTitle>
          <CardDescription>
            Your Zambian NRC or passport, a live selfie, and a review by a member of our team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {identityStatus === 'approved' ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-gain mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Verification Complete</h3>
              <p className="text-muted-foreground">Your identity has been verified by our review team.</p>
            </div>
          ) : identityStatus === 'pending' ? (
            <div className="text-center py-8">
              <Clock className="h-16 w-16 text-warning mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Under Review</h3>
              <p className="text-muted-foreground">
                A member of our team is checking your documents. Most reviews finish within 1–2 business days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {identityStatus === 'rejected' && application?.rejection_reason && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>
                    Your last application was not approved: “{application.rejection_reason}”.
                    Fix that and submit again below.
                  </span>
                </div>
              )}
              <KYCVerificationFlow onSubmitted={setApplication} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• We accept only a Zambian National Registration Card or a passport</li>
            <li>• Documents must be clear, in colour, and not expired</li>
            <li>• Your selfie is taken live in the app — gallery photos are not accepted</li>
            <li>• Every application is reviewed by a person; most finish within 1–2 business days</li>
            <li>• Your status updates on this page as soon as the review is done</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verification;
