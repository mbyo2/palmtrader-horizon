import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { InhouseKYCService, type KYCApplication } from "@/services/InhouseKYCService";
import { ShieldAlert, Clock, ShieldCheck, ShieldX } from "lucide-react";

/**
 * Just-in-time KYC prompt: shown in context (profile, transfers, P2P…) when
 * a feature needs a verified identity. States the reason plainly and links
 * to the in-house verification flow. Renders nothing once approved.
 */
interface KYCStatusBannerProps {
  reason?: string;
}

const KYCStatusBanner = ({ reason }: KYCStatusBannerProps) => {
  const { user, accountDetails } = useAuth();
  const [application, setApplication] = useState<KYCApplication | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    InhouseKYCService.getMyLatestApplication(user.id)
      .then(setApplication)
      .catch(() => setApplication(null))
      .finally(() => setLoaded(true));
  }, [user]);

  if (!user || !loaded) return null;

  const status = application?.status ?? (accountDetails?.kyc_status === "approved" ? "approved" : null);
  if (status === "approved") return null;

  const content =
    status === "pending"
      ? {
          icon: <Clock className="h-5 w-5 text-warning" />,
          title: "Identity verification in review",
          body: "Your documents are with our review team. This feature unlocks as soon as your identity is approved.",
          cta: "View status",
        }
      : status === "rejected"
        ? {
            icon: <ShieldX className="h-5 w-5 text-destructive" />,
            title: "Identity verification was not approved",
            body: application?.rejection_reason
              ? `Reason given: ${application.rejection_reason}. You can submit again with corrected documents.`
              : "You can submit again with corrected documents.",
            cta: "Submit again",
          }
        : {
            icon: <ShieldAlert className="h-5 w-5 text-warning" />,
            title: "Verify your identity to continue",
            body:
              reason ??
              "This feature needs a verified identity. It takes a few minutes: your NRC or passport, a live selfie, and a short review by our team.",
            cta: "Verify now",
          };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0">{content.icon}</span>
        <div className="min-w-0">
          <p className="font-medium">{content.title}</p>
          <p className="text-sm text-muted-foreground">{content.body}</p>
        </div>
      </div>
      <Button asChild size="sm">
        <Link to="/kyc">{content.cta}</Link>
      </Button>
    </div>
  );
};

export const KYCVerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 text-sm text-gain">
    <ShieldCheck className="h-4 w-4" /> Identity verified
  </span>
);

export default KYCStatusBanner;
