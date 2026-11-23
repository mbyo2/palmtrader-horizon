
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import FundTransferInterface from "@/components/Banking/FundTransferInterface";
import KYCStatusBanner from "@/components/KYC/KYCStatusBanner";

const Transfers = () => {
  const { isLoading } = useProtectedRoute();

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Fund Transfers</h1>
      <p className="text-muted-foreground">
        Deposit or withdraw funds from your trading account.
      </p>

      <KYCStatusBanner reason="Withdrawals need a verified identity. Verify with your NRC or passport and a live selfie — a member of our team reviews every application." />

      <FundTransferInterface />
    </div>
  );
};

export default Transfers;
