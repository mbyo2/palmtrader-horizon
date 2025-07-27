
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyService } from "@/services/CurrencyService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CalendarDays, TrendingUp, Shield } from "lucide-react";

interface GovernmentSecurity {
  id: string;
  name: string;
  type: 'treasury_bill' | 'government_bond';
  currency: string;
  yield: number;
  minimumInvestment: number;
  maturityDays?: number;
  maturityYears?: number;
  issuer: string;
  couponRate?: number;
  lastAuctionDate?: string;
}

// Fetch government securities from localStorage (can be enhanced to use API later)
const fetchGovernmentSecurities = async (): Promise<GovernmentSecurity[]> => {
  try {
    // Try to get from localStorage first
    const stored = localStorage.getItem('government_securities');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Default data if nothing in localStorage
    const defaultSecurities = [
      {
        id: "ZMW-TB-91D",
        name: "91-Day Treasury Bill",
        type: "treasury_bill" as const,
        currency: "ZMW",
        yield: 12.5,
        minimumInvestment: 1000,
        maturityDays: 91,
        issuer: "Bank of Zambia",
        lastAuctionDate: "2024-01-15"
      },
      {
        id: "ZMW-TB-182D",
        name: "182-Day Treasury Bill",
        type: "treasury_bill" as const,
        currency: "ZMW",
        yield: 13.2,
        minimumInvestment: 1000,
        maturityDays: 182,
        issuer: "Bank of Zambia",
        lastAuctionDate: "2024-01-15"
      },
      {
        id: "ZMW-GB-2Y",
        name: "2-Year Government Bond",
        type: "government_bond" as const,
        currency: "ZMW",
        yield: 14.8,
        minimumInvestment: 2500,
        maturityYears: 2,
        issuer: "Ministry of Finance",
        couponRate: 14.0
      },
      {
        id: "ZMW-GB-5Y",
        name: "5-Year Government Bond",
        type: "government_bond" as const,
        currency: "ZMW",
        yield: 15.2,
        minimumInvestment: 5000,
        maturityYears: 5,
        issuer: "Ministry of Finance",
        couponRate: 14.5
      },
      {
        id: "ZMW-GB-10Y",
        name: "10-Year Government Bond",
        type: "government_bond" as const,
        currency: "ZMW",
        yield: 16.1,
        minimumInvestment: 10000,
        maturityYears: 10,
        issuer: "Ministry of Finance",
        couponRate: 15.5
      }
    ];
    
    // Store default data in localStorage
    localStorage.setItem('government_securities', JSON.stringify(defaultSecurities));
    return defaultSecurities;
  } catch (error) {
    console.error("Error fetching government securities:", error);
    throw error;
  }
};

const GovernmentSecurities = () => {
  const { user, requireAuth } = useAuth();
  const [securities, setSecurities] = useState<GovernmentSecurity[]>([]);
  const [selectedSecurity, setSelectedSecurity] = useState<GovernmentSecurity | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInvesting, setIsInvesting] = useState(false);

  useEffect(() => {
    const fetchSecuritiesData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchGovernmentSecurities();
        setSecurities(data);
      } catch (error) {
        console.error("Error fetching government securities:", error);
        toast.error("Failed to load government securities");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSecuritiesData();
  }, []);

  const handleInvest = async () => {
    if (!selectedSecurity || !investmentAmount) return;

    requireAuth(async () => {
      setIsInvesting(true);
      try {
        const amount = parseFloat(investmentAmount);
        
        if (amount < selectedSecurity.minimumInvestment) {
          toast.error(`Minimum investment is ${CurrencyService.formatCurrency(selectedSecurity.minimumInvestment, 'ZMW')}`);
          return;
        }

        // In a real implementation, this would call an API to process the investment
        // For now, we'll simulate the process
        await new Promise(resolve => setTimeout(resolve, 2000));

        toast.success(
          `Investment of ${CurrencyService.formatCurrency(amount, 'ZMW')} in ${selectedSecurity.name} processed successfully!`
        );
        
        setSelectedSecurity(null);
        setInvestmentAmount('');
      } catch (error) {
        console.error("Investment error:", error);
        toast.error("Investment failed. Please try again.");
      } finally {
        setIsInvesting(false);
      }
    });
  };

  const calculateReturns = (amount: number, security: GovernmentSecurity) => {
    if (security.type === 'treasury_bill' && security.maturityDays) {
      const annualReturn = amount * (security.yield / 100);
      const actualReturn = (annualReturn * security.maturityDays) / 365;
      return actualReturn;
    } else if (security.type === 'government_bond' && security.maturityYears) {
      const annualReturn = amount * (security.yield / 100);
      const totalReturn = annualReturn * security.maturityYears;
      return totalReturn;
    }
    return 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Government Securities</h2>
          <p className="text-muted-foreground">
            Invest in Zambian Treasury Bills and Government Bonds
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Shield className="h-3 w-3" />
          <span>Government Backed</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {securities.map((security) => (
          <Card 
            key={security.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedSecurity?.id === security.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedSecurity(security)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{security.name}</CardTitle>
                <Badge variant={security.type === 'treasury_bill' ? 'default' : 'secondary'}>
                  {security.type === 'treasury_bill' ? 'T-Bill' : 'Bond'}
                </Badge>
              </div>
              <CardDescription>{security.issuer}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Yield</span>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-green-500">{security.yield}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Minimum Investment</span>
                  <span className="font-medium">
                    {CurrencyService.formatCurrency(security.minimumInvestment, 'ZMW')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Maturity</span>
                  <div className="flex items-center space-x-1">
                    <CalendarDays className="h-4 w-4" />
                    <span className="font-medium">
                      {security.maturityDays ? `${security.maturityDays} days` : `${security.maturityYears} years`}
                    </span>
                  </div>
                </div>

                {security.couponRate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Coupon Rate</span>
                    <span className="font-medium">{security.couponRate}%</span>
                  </div>
                )}

                {security.lastAuctionDate && (
                  <div className="text-xs text-muted-foreground">
                    Last auction: {new Date(security.lastAuctionDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSecurity && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Invest in {selectedSecurity.name}</CardTitle>
            <CardDescription>
              Enter the amount you want to invest in this government security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Investment Amount (ZMW)</Label>
              <Input
                id="amount"
                type="number"
                step="100"
                min={selectedSecurity.minimumInvestment}
                placeholder={selectedSecurity.minimumInvestment.toString()}
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum investment: {CurrencyService.formatCurrency(selectedSecurity.minimumInvestment, 'ZMW')}
              </p>
            </div>

            {investmentAmount && parseFloat(investmentAmount) >= selectedSecurity.minimumInvestment && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Investment Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Principal:</span>
                    <div className="font-medium">
                      {CurrencyService.formatCurrency(parseFloat(investmentAmount), 'ZMW')}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected Return:</span>
                    <div className="font-medium text-green-600">
                      {CurrencyService.formatCurrency(
                        calculateReturns(parseFloat(investmentAmount), selectedSecurity), 
                        'ZMW'
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total at Maturity:</span>
                    <div className="font-medium">
                      {CurrencyService.formatCurrency(
                        parseFloat(investmentAmount) + calculateReturns(parseFloat(investmentAmount), selectedSecurity), 
                        'ZMW'
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Yield:</span>
                    <div className="font-medium">{selectedSecurity.yield}%</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={handleInvest}
                disabled={
                  !investmentAmount || 
                  parseFloat(investmentAmount) < selectedSecurity.minimumInvestment ||
                  isInvesting ||
                  !user
                }
                className="flex-1"
              >
                {isInvesting ? 'Processing...' : 'Invest Now'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedSecurity(null)}
                disabled={isInvesting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GovernmentSecurities;
