import { Helmet } from "react-helmet";
import EnhancedOptionsTrading from "@/components/Trading/EnhancedOptionsTrading";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function OptionsTradingPage() {
  const { isLoading } = useProtectedRoute();

  if (isLoading) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Options Trading - SmartTrade</title>
        <meta name="description" content="Advanced options trading with risk analysis, option chains, and strategic tools." />
      </Helmet>
      <div className="container py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Options Trading</h1>
            <p className="text-muted-foreground">
              Advanced options trading with comprehensive risk management
            </p>
          </div>
          <EnhancedOptionsTrading />
        </div>
      </div>
    </>
  );
}