
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEnhancedTrading } from "@/hooks/useEnhancedTrading";
import { AlertTriangle, CheckCircle, Clock, DollarSign } from "lucide-react";
import StockSelector from "./StockSelector";
import StockInfo from "./StockInfo";
import EnhancedOrderForm from "./EnhancedOrderForm";
import RealTimePortfolioSummary from "./RealTimePortfolioSummary";
import KYCStatusCard from "../KYC/KYCStatusCard";

const EnhancedTradingInterface = () => {
  const {
    portfolioSummary,
    kycStatus,
    isLoading,
    isExecutingOrder,
    canTrade,
    tradingLimits,
    executeOrder,
    getConnectionStatus
  } = useEnhancedTrading();

  const connectionStatus = getConnectionStatus();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Market Connection</CardTitle>
            <Badge variant={connectionStatus.connected ? "default" : "destructive"}>
              {connectionStatus.connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* KYC Status */}
      <KYCStatusCard kycStatus={kycStatus} />

      {/* Trading Restrictions Alert */}
      {!canTrade && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Trading is restricted. Complete KYC verification to start trading.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Summary */}
        <div className="lg:col-span-1">
          <RealTimePortfolioSummary summary={portfolioSummary} />
        </div>

        {/* Trading Interface */}
        <div className="lg:col-span-2">
          <EnhancedOrderForm
            canTrade={canTrade}
            tradingLimits={tradingLimits}
            isExecutingOrder={isExecutingOrder}
            onExecuteOrder={executeOrder}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedTradingInterface;
