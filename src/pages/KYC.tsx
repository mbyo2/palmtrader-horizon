
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KYCStatusCard from "@/components/KYC/KYCStatusCard";
import KYCDocumentUpload from "@/components/KYC/KYCDocumentUpload";
import { useEnhancedTrading } from "@/hooks/useEnhancedTrading";

const KYC = () => {
  const { isLoading } = useProtectedRoute();
  const { kycStatus, isLoading: isKYCLoading } = useEnhancedTrading();

  if (isLoading || isKYCLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">KYC Verification</h1>
      <p className="text-muted-foreground">
        Complete your Know Your Customer (KYC) verification to unlock full trading capabilities.
      </p>
      
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="status" className="space-y-6">
          <KYCStatusCard kycStatus={kycStatus} />
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-6">
          <KYCDocumentUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KYC;
