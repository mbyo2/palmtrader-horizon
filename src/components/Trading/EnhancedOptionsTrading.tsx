import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Calculator, AlertTriangle, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OptionChain {
  strike: number;
  callBid: number;
  callAsk: number;
  callVolume: number;
  putBid: number;
  putAsk: number;
  putVolume: number;
  expiry: string;
}

interface OptionPosition {
  id: string;
  symbol: string;
  option_type: string;
  strike_price: number;
  expiration_date: string;
  contracts: number;
  premium_per_contract: number;
  current_value: number;
  pnl: number;
  status: string;
}

const EnhancedOptionsTrading = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("AAPL");
  const [optionType, setOptionType] = useState<"CALL" | "PUT">("CALL");
  const [strategy, setStrategy] = useState<"long_call" | "long_put" | "covered_call" | "protective_put" | "straddle" | "strangle">("long_call");
  const [strikePrice, setStrikePrice] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [contracts, setContracts] = useState("1");
  const [premium, setPremium] = useState("");
  const [optionChain, setOptionChain] = useState<OptionChain[]>([]);
  const [positions, setPositions] = useState<OptionPosition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadOptionPositions();
      loadOptionChain();
    }
  }, [user, symbol]);

  const loadOptionPositions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('options_trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate current values and P&L (mock calculation)
      const enhancedPositions = data?.map(position => ({
        ...position,
        current_value: position.premium_per_contract * position.contracts * 1.1, // Mock current value
        pnl: (position.premium_per_contract * position.contracts * 1.1) - (position.premium_per_contract * position.contracts)
      })) || [];

      setPositions(enhancedPositions);
    } catch (error) {
      console.error('Error loading option positions:', error);
    }
  };

  const loadOptionChain = () => {
    // Mock option chain data
    const mockChain: OptionChain[] = [
      { strike: 150, callBid: 8.50, callAsk: 8.80, callVolume: 1250, putBid: 2.10, putAsk: 2.30, putVolume: 890, expiry: "2024-03-15" },
      { strike: 155, callBid: 5.20, callAsk: 5.50, callVolume: 2100, putBid: 4.80, putAsk: 5.10, putVolume: 1450, expiry: "2024-03-15" },
      { strike: 160, callBid: 2.90, callAsk: 3.20, callVolume: 1890, putBid: 8.10, putAsk: 8.40, putVolume: 1120, expiry: "2024-03-15" },
      { strike: 165, callBid: 1.40, callAsk: 1.70, callVolume: 1340, putBid: 12.50, putAsk: 12.80, putVolume: 780, expiry: "2024-03-15" },
    ];
    setOptionChain(mockChain);
  };

  const calculateMaxLoss = () => {
    const premiumPaid = parseFloat(premium) * parseInt(contracts);
    
    switch (strategy) {
      case "long_call":
      case "long_put":
        return premiumPaid;
      case "covered_call":
        return "Unlimited (stock price decline)";
      case "protective_put":
        return `$${(parseFloat(strikePrice) - parseFloat(premium)) * parseInt(contracts)}`;
      default:
        return premiumPaid;
    }
  };

  const calculateMaxProfit = () => {
    switch (strategy) {
      case "long_call":
        return "Unlimited";
      case "long_put":
        return `$${(parseFloat(strikePrice) - parseFloat(premium)) * parseInt(contracts)}`;
      case "covered_call":
        return `$${(parseFloat(strikePrice) - parseFloat(premium)) * parseInt(contracts)}`;
      case "protective_put":
        return "Unlimited";
      default:
        return "Varies";
    }
  };

  const calculateBreakeven = () => {
    const strike = parseFloat(strikePrice);
    const prem = parseFloat(premium);
    
    switch (strategy) {
      case "long_call":
        return `$${(strike + prem).toFixed(2)}`;
      case "long_put":
        return `$${(strike - prem).toFixed(2)}`;
      default:
        return "Calculate manually";
    }
  };

  const handleOptionsOrder = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to place options trades",
        variant: "destructive"
      });
      return;
    }

    if (!symbol || !strikePrice || !expirationDate || !contracts || !premium) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("options_trades").insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        option_type: optionType,
        strike_price: parseFloat(strikePrice),
        expiration_date: expirationDate,
        contracts: parseInt(contracts),
        premium_per_contract: parseFloat(premium),
        total_premium: parseFloat(premium) * parseInt(contracts),
      });

      if (error) throw error;

      toast({
        title: "Options Order Placed",
        description: `${optionType} option order for ${symbol} placed successfully`,
      });

      // Reset form and reload positions
      setStrikePrice("");
      setExpirationDate("");
      setContracts("1");
      setPremium("");
      await loadOptionPositions();

    } catch (error) {
      console.error("Error placing options order:", error);
      toast({
        title: "Error",
        description: "Failed to place options order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trade" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trade">Trade Options</TabsTrigger>
          <TabsTrigger value="chain">Option Chain</TabsTrigger>
          <TabsTrigger value="positions">My Positions</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
        </TabsList>

        <TabsContent value="trade">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trading Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Options Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Symbol</label>
                    <Input
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      placeholder="e.g., AAPL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Option Type</label>
                    <Select value={optionType} onValueChange={(value: "CALL" | "PUT") => setOptionType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CALL">CALL</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Strategy</label>
                  <Select value={strategy} onValueChange={(value: any) => setStrategy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long_call">Long Call</SelectItem>
                      <SelectItem value="long_put">Long Put</SelectItem>
                      <SelectItem value="covered_call">Covered Call</SelectItem>
                      <SelectItem value="protective_put">Protective Put</SelectItem>
                      <SelectItem value="straddle">Straddle</SelectItem>
                      <SelectItem value="strangle">Strangle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Strike Price</label>
                    <Input
                      type="number"
                      value={strikePrice}
                      onChange={(e) => setStrikePrice(e.target.value)}
                      placeholder="150.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contracts</label>
                    <Input
                      type="number"
                      value={contracts}
                      onChange={(e) => setContracts(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiration</label>
                    <Input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Premium</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={premium}
                      onChange={(e) => setPremium(e.target.value)}
                      placeholder="5.50"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleOptionsOrder}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Placing Order..." : `Place ${optionType} Order`}
                </Button>
              </CardContent>
            </Card>

            {/* Risk Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-sm font-medium text-red-800">Max Loss</div>
                    <div className="text-lg font-bold text-red-900">{calculateMaxLoss()}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-800">Max Profit</div>
                    <div className="text-lg font-bold text-green-900">{calculateMaxProfit()}</div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">Breakeven</div>
                  <div className="text-lg font-bold text-blue-900">{calculateBreakeven()}</div>
                </div>

                {premium && contracts && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-800">Total Cost</div>
                    <div className="text-lg font-bold text-gray-900">
                      ${(parseFloat(premium) * parseInt(contracts) * 100).toLocaleString()}
                    </div>
                  </div>
                )}

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Options trading involves significant risk. You can lose 100% of your premium.
                    Please understand the risks before trading.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chain">
          <Card>
            <CardHeader>
              <CardTitle>Option Chain - {symbol}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Calls</TableHead>
                    <TableHead>Bid</TableHead>
                    <TableHead>Ask</TableHead>
                    <TableHead>Vol</TableHead>
                    <TableHead>Strike</TableHead>
                    <TableHead>Vol</TableHead>
                    <TableHead>Bid</TableHead>
                    <TableHead>Ask</TableHead>
                    <TableHead>Puts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optionChain.map((option) => (
                    <TableRow key={option.strike}>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setOptionType("CALL");
                          setStrikePrice(option.strike.toString());
                          setPremium(((option.callBid + option.callAsk) / 2).toString());
                        }}>
                          C
                        </Button>
                      </TableCell>
                      <TableCell>{option.callBid}</TableCell>
                      <TableCell>{option.callAsk}</TableCell>
                      <TableCell>{option.callVolume}</TableCell>
                      <TableCell className="font-bold">{option.strike}</TableCell>
                      <TableCell>{option.putVolume}</TableCell>
                      <TableCell>{option.putBid}</TableCell>
                      <TableCell>{option.putAsk}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setOptionType("PUT");
                          setStrikePrice(option.strike.toString());
                          setPremium(((option.putBid + option.putAsk) / 2).toString());
                        }}>
                          P
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Option Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No option positions found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Strike</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Contracts</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-bold">{position.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={position.option_type === 'CALL' ? 'default' : 'destructive'}>
                            {position.option_type}
                          </Badge>
                        </TableCell>
                        <TableCell>${position.strike_price}</TableCell>
                        <TableCell>{new Date(position.expiration_date).toLocaleDateString()}</TableCell>
                        <TableCell>{position.contracts}</TableCell>
                        <TableCell>${position.premium_per_contract}</TableCell>
                        <TableCell>${position.current_value?.toFixed(2)}</TableCell>
                        <TableCell className={position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {position.pnl >= 0 ? (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              +${position.pnl?.toFixed(2)}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <TrendingDown className="h-4 w-4" />
                              ${position.pnl?.toFixed(2)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{position.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                name: "Long Call",
                description: "Buy a call option expecting price to rise",
                maxLoss: "Premium paid",
                maxProfit: "Unlimited",
                outlook: "Bullish"
              },
              {
                name: "Long Put",
                description: "Buy a put option expecting price to fall",
                maxLoss: "Premium paid",
                maxProfit: "Strike - Premium",
                outlook: "Bearish"
              },
              {
                name: "Covered Call",
                description: "Own stock + sell call option",
                maxLoss: "Stock price decline",
                maxProfit: "Strike - Cost + Premium",
                outlook: "Neutral to Bullish"
              },
              {
                name: "Protective Put",
                description: "Own stock + buy put option",
                maxLoss: "Strike - Stock Price - Premium",
                maxProfit: "Unlimited",
                outlook: "Bullish with Protection"
              }
            ].map((strategy, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{strategy.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{strategy.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Max Loss:</span>
                      <span className="text-sm font-medium">{strategy.maxLoss}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Max Profit:</span>
                      <span className="text-sm font-medium">{strategy.maxProfit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Outlook:</span>
                      <Badge variant="outline">{strategy.outlook}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedOptionsTrading;