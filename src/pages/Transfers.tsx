
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import FundTransferInterface from "@/components/Banking/FundTransferInterface";

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
      
      <FundTransferInterface />
    </div>
  );
};

export default Transfers;
