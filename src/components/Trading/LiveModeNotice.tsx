import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, Building2, Smartphone, Globe, Lock } from "lucide-react";

const LiveModeNotice = () => {
  return (
    <Card className="border-success/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-success" />
          Live Trading Setup
          <Badge className="bg-success text-xs">Coming Soon</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Broker API Required</AlertTitle>
          <AlertDescription>
            Live trading requires a connected broker API (Interactive Brokers, cTrader, or custom). 
            Contact support to configure your live trading connection.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Supported Zambian Payment Methods for Deposits:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Smartphone className="h-8 w-8 text-success" />
              <div>
                <p className="font-medium text-sm">Mobile Money</p>
                <p className="text-xs text-muted-foreground">MTN, Airtel, Zamtel</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-sm">Bank Transfer</p>
                <p className="text-xs text-muted-foreground">Zanaco, FNB, Stanbic</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Globe className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-sm">VISA / Mastercard</p>
                <p className="text-xs text-muted-foreground">Debit & Credit</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p><strong>Note:</strong> While live trading APIs are being connected, you can practice with your Demo account using $100,000 in virtual funds.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveModeNotice;
