import { useEffect, useState } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import KYCStatusCard from "@/components/KYC/KYCStatusCard";
import KYCVerificationFlow from "@/components/KYC/KYCVerificationFlow";
import { useEnhancedTrading } from "@/hooks/useEnhancedTrading";
import { InhouseKYCService, type KYCApplication } from "@/services/InhouseKYCService";
import { Shield, Clock, CheckCircle, XCircle } from "lucide-react";

/**
 * /kyc — PalmCacia's in-house identity verification (replaces Didit).
 * Status first; the guided flow appears when there is something to submit.
 */
const KYC = () => {
  const { isLoading } = useProtectedRoute();
  const { user } = useAuth();
  const { kycStatus, isLoading: isKYCLoading, refreshKYCStatus } = useEnhancedTrading();
  const [application, setApplication] = useState<KYCApplication | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    InhouseKYCService.getMyLatestApplication(user.id)
      .then(setApplication)
      .catch(() => setApplication(null))
      .finally(() => setAppLoading(false));
  }, [user]);

  if (isLoading || isKYCLoading || appLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  const status = application?.status;

  return (
    <div className="container space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Identity Verification</h1>
          <p className="text-muted-foreground">
            Verify once with your NRC or passport to unlock withdrawals, higher limits and P2P trading.
          </p>
        </div>
      </div>

      {kycStatus && <KYCStatusCard kycStatus={kycStatus} />}

      {status === "approved" && (
        <Card>
          <CardContent className="space-y-2 py-8 text-center">
            <CheckCircle className="mx-auto h-14 w-14 text-gain" />
            <h3 className="text-xl font-semibold">Identity verified</h3>
            <p className="text-sm text-muted-foreground">
              Our review team approved your {application.document_type === "nrc" ? "National Registration Card" : "passport"} on{" "}
              {application.reviewed_at ? new Date(application.reviewed_at).toLocaleDateString() : "—"}.
            </p>
          </CardContent>
        </Card>
      )}

      {status === "pending" && (
        <Card>
          <CardContent className="space-y-2 py-8 text-center">
            <Clock className="mx-auto h-14 w-14 text-warning" />
            <h3 className="text-xl font-semibold">Application under review</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Submitted {new Date(application.created_at).toLocaleString()}. A member of our team
              is comparing your selfie with your document — most reviews finish within 1–2
              business days, and the outcome will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {(status === "rejected" || !status) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === "rejected" ? (
                <><XCircle className="h-5 w-5 text-destructive" /> Previous application not approved</>
              ) : (
                "Verify your identity"
              )}
            </CardTitle>
            <CardDescription>
              {status === "rejected" && application.rejection_reason
                ? `Our reviewer said: "${application.rejection_reason}" — fix that and submit again below.`
                : "Five short steps. Your documents are reviewed by a person on our team — never sold, never shared."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KYCVerificationFlow
              onSubmitted={(app) => {
                setApplication(app);
                void refreshKYCStatus();
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KYC;
