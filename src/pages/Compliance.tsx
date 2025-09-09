import { Helmet } from "react-helmet";
import ComplianceSystem from "@/components/Compliance/ComplianceSystem";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function CompliancePage() {
  const { isLoading } = useProtectedRoute();

  if (isLoading) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Compliance - SmartTrade</title>
        <meta name="description" content="View your compliance status, regulatory requirements, and KYC verification progress." />
      </Helmet>
      <div className="container py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Compliance Center</h1>
            <p className="text-muted-foreground">
              Monitor your compliance status and regulatory requirements
            </p>
          </div>
          <ComplianceSystem />
        </div>
      </div>
    </>
  );
}