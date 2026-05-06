import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlpacaPaperService } from "@/services/AlpacaPaperService";
import { toast } from "sonner";
import { RefreshCw, TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";

interface PaperAccount {
  status: string;
  cash: string;
  buying_power: string;
  portfolio_value: string;
  equity: string;
  currency: string;
}

interface PaperPosition {
  symbol: string;
  qty: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  avg_entry_price: string;
}

interface LocalOrder {
  id: string;
  symbol: string;
  type: string;
  shares: number;
  price: number;
  status: string;
  order_type: string;
  created_at: string;
  alpaca_order_id?: string;
}

const DemoPaperTradingPanel = () => {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [marketOpen, setMarketOpen] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState("1");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState<"day" | "gtc">("day");

  const load = async () => {
    setLoading(true);
    try {
      const [acc, pos, ord, clk] = await Promise.all([
        AlpacaPaperService.getAccount(),
        AlpacaPaperService.getPositions(),
        AlpacaPaperService.getOrders(25),
        AlpacaPaperService.getClock().catch(() => null),
      ]);
      setAccount(acc.account);
      setPositions((pos.positions ?? []) as PaperPosition[]);
      setOrders((ord.orders ?? []) as LocalOrder[]);
      setMarketOpen(clk?.clock?.is_open ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load demo account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  const submit = async () => {
    if (!symbol || !qty) return toast.error("Enter symbol and quantity");
    setSubmitting(true);
    try {
      const res = await AlpacaPaperService.placeOrder({
        symbol: symbol.toUpperCase(),
        qty: Number(qty),
        side,
        type: orderType,
        time_in_force: tif,
        limit_price: orderType === "limit" ? Number(limitPrice) : undefined,
      });
      toast.success(`Order ${res.order.status}: ${side.toUpperCase()} ${qty} ${symbol.toUpperCase()}`);
      setQty("1");
      setLimitPrice("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async (id?: string) => {
    if (!id) return;
    try {
      await AlpacaPaperService.cancelOrder(id);
      toast.success("Order cancelled");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Demo Trading — Alpaca Paper
            </CardTitle>
            <CardDescription>Real US-equity prices. Virtual money. Orders execute live in the paper market.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {marketOpen !== null && (
              <Badge variant={marketOpen ? "default" : "secondary"} className="gap-1">
                <Clock className="h-3 w-3" /> Market {marketOpen ? "Open" : "Closed"}
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Equity" value={fmt(account?.equity)} />
          <Stat label="Cash" value={fmt(account?.cash)} />
          <Stat label="Buying Power" value={fmt(account?.buying_power)} />
          <Stat label="Portfolio Value" value={fmt(account?.portfolio_value)} />
        </div>

        {marketOpen === false && (
          <Alert>
            <AlertDescription className="text-xs">
              Market is closed. Limit orders with TIF=GTC will queue until next open.
            </AlertDescription>
          </Alert>
        )}

        {/* Order form */}
        <div className="space-y-3 border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Symbol</Label>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={(v) => setOrderType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Time In Force</Label>
              <Select value={tif} onValueChange={(v) => setTif(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="gtc">GTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {orderType === "limit" && (
            <div>
              <Label>Limit Price</Label>
              <Input type="number" step="0.01" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => { setSide("buy"); setTimeout(submit, 0); }}
              disabled={submitting}
            >
              <TrendingUp className="h-4 w-4 mr-2" /> Buy
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { setSide("sell"); setTimeout(submit, 0); }}
              disabled={submitting}
            >
              <TrendingDown className="h-4 w-4 mr-2" /> Sell
            </Button>
          </div>
        </div>

        {/* Positions / Orders */}
        <Tabs defaultValue="positions">
          <TabsList>
            <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="positions" className="space-y-2 mt-3">
            {positions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No positions yet. Place a buy order to get started.</p>
            ) : positions.map((p) => (
              <div key={p.symbol} className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <div className="font-semibold">{p.symbol}</div>
                  <div className="text-xs text-muted-foreground">{Number(p.qty).toFixed(2)} @ ${Number(p.avg_entry_price).toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">${Number(p.market_value).toFixed(2)}</div>
                  <div className={`text-xs ${Number(p.unrealized_pl) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {Number(p.unrealized_pl) >= 0 ? "+" : ""}${Number(p.unrealized_pl).toFixed(2)} ({(Number(p.unrealized_plpc) * 100).toFixed(2)}%)
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="orders" className="space-y-2 mt-3">
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No orders yet.</p>
            ) : orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={o.type === "buy" ? "default" : "destructive"} className="text-xs">{o.type.toUpperCase()}</Badge>
                    <span className="font-medium">{o.symbol}</span>
                    <span className="text-xs text-muted-foreground">{o.order_type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className="text-sm">{Number(o.shares)} @ ${Number(o.price).toFixed(2)}</div>
                    <Badge variant="outline" className="text-xs">{o.status}</Badge>
                  </div>
                  {(o.status === "pending" || o.status === "new" || o.status === "accepted") && o.alpaca_order_id && (
                    <Button size="sm" variant="ghost" onClick={() => cancelOrder(o.alpaca_order_id)}>Cancel</Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-semibold">{value}</div>
  </div>
);

const fmt = (v?: string) => (v != null ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—");

export default DemoPaperTradingPanel;
