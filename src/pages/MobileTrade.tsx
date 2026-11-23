import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileTradingInterface } from "@/components/Trading/Mobile/MobileTradingInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { TradingErrorBoundary } from "@/components/ErrorBoundary/TradingErrorBoundary";
import { getInstrument, getPairDef, getStockDef } from "@/services/demo/demoMarket";
import { isDemoSync } from "@/services/demo/DemoBackend";
import { DEMO_USER_ID, subscribeDemoState, walletBalance } from "@/services/demo/demoStore";
import { DemoSpot } from "@/services/demo/demoExchange";
import type { SpotOrder } from "@/services/SpotTradingService";
import { useDemoPrice } from "@/hooks/useDemoPrice";
import { useOrders } from "@/hooks/useOrders";
import { usePositions } from "@/hooks/usePositions";
import { toast } from "sonner";
import WatchlistButton from "@/components/WatchlistButton";

/**
 * Trade page for /trade/:symbol — works on every viewport.
 * Instrument data comes from the market data layer (simulated market in
 * demo mode); orders execute through OrderExecutionEngine and appear in
 * the orders/positions sections below.
 */
const MobileTrade = () => {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const symbol = (rawSymbol || "").toUpperCase();
  const instrument = getInstrument(symbol);
  const { price, changePct } = useDemoPrice(symbol || null);
  const { orders, cancelOrder } = useOrders();
  const { positions } = usePositions();

  // Demo crypto instruments have no stock position/order book — their
  // holdings live in the demo spot wallet and their orders in DemoSpot.
  const stockDef = symbol ? getStockDef(symbol) : undefined;
  const pairId = !stockDef && symbol
    ? (getPairDef(symbol)
        ? symbol
        : getPairDef(`${symbol}-USDT`)
          ? `${symbol}-USDT`
          : getPairDef(`${symbol}-ZMW`)
            ? `${symbol}-ZMW`
            : null)
    : null;
  const isCryptoDemo = isDemoSync() && !!instrument && !stockDef && !!pairId;
  const [spotOrders, setSpotOrders] = useState<SpotOrder[]>([]);
  const [baseHolding, setBaseHolding] = useState(0);

  useEffect(() => {
    if (!isCryptoDemo || !pairId) {
      setSpotOrders([]);
      setBaseHolding(0);
      return;
    }
    const read = () => {
      const pair = getPairDef(pairId);
      setSpotOrders(DemoSpot.getOrderHistory(DEMO_USER_ID, 50).filter((o) => o.pair_id === pairId));
      if (pair) {
        const w = walletBalance(pair.base, "spot");
        setBaseHolding(w.available + w.locked);
      }
    };
    read();
    return subscribeDemoState(read);
  }, [isCryptoDemo, pairId]);

  if (!symbol) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No symbol provided</p>
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">{symbol} is not available</p>
        <p className="text-muted-foreground max-w-md">
          This symbol is not part of the demo market catalogue. Browse the markets to find tradable US, LuSE and crypto instruments.
        </p>
        <Button onClick={() => navigate("/markets")}>Browse markets</Button>
      </div>
    );
  }

  const displayPrice = price ?? instrument.basePrice;
  const change = (displayPrice * changePct) / 100;
  const isUp = changePct >= 0;
  const symbolOrders = orders.filter(o => o.symbol === symbol);
  const position = positions.find(p => p.symbol === symbol);
  const currencySymbol = instrument.currency === "ZMW" ? "K" : "$";

  return (
    <TradingErrorBoundary>
      <div className="container mx-auto px-4 py-4 max-w-5xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{symbol}</h1>
              <Badge variant="outline">{instrument.exchange}</Badge>
              <WatchlistButton symbol={symbol} />
            </div>
            <p className="text-sm text-muted-foreground">{instrument.name}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold tracking-tight">
              {currencySymbol}{displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center justify-end gap-1 text-sm font-medium ${isUp ? "text-gain" : "text-loss"}`}>
              {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isUp ? "+" : ""}{change.toFixed(2)} ({isUp ? "+" : ""}{changePct.toFixed(2)}%)
            </div>
          </div>
        </div>

        <MobileTradingInterface
          symbol={symbol}
          companyName={instrument.name}
          currentPrice={displayPrice}
          priceChange={change}
          priceChangePercent={changePct}
        />

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your position</CardTitle>
            </CardHeader>
            <CardContent>
              {isCryptoDemo ? (
                baseHolding > 0 ? (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Amount</div>
                      <div className="font-medium">{baseHolding.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Wallet</div>
                      <div className="font-medium">Spot</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Market value</div>
                      <div className="font-medium">{currencySymbol}{(baseHolding * displayPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You don't own {symbol} yet. Place a buy order above to open a position.</p>
                )
              ) : position ? (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Shares</div>
                    <div className="font-medium">{position.quantity.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Avg. cost</div>
                    <div className="font-medium">{currencySymbol}{position.average_cost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Market value</div>
                    <div className="font-medium">{currencySymbol}{(position.quantity * displayPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You don't own {symbol} yet. Place a buy order above to open a position.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orders for {symbol} ({isCryptoDemo ? spotOrders.length : symbolOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isCryptoDemo ? (
                spotOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders for {symbol} yet.</p>
                ) : (
                  <div className="space-y-2">
                    {spotOrders.slice(0, 8).map(o => (
                      <div key={o.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                        <span>
                          <Badge variant={o.side === "buy" ? "default" : "destructive"} className="mr-2">{o.side.toUpperCase()}</Badge>
                          {o.quantity} @ {o.average_fill_price ? `${currencySymbol}${o.average_fill_price.toFixed(2)}` : o.price ? `${currencySymbol}${o.price.toFixed(2)}` : "market"}
                        </span>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline">{o.status}</Badge>
                          {(o.status === "open" || o.status === "partially_filled") && (
                            <Button size="sm" variant="ghost" onClick={() => {
                              const r = DemoSpot.cancelOrder(o.id);
                              if (r.success) toast.success("Order cancelled");
                              else toast.error(r.error || "Failed to cancel order");
                            }}>Cancel</Button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : symbolOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders for {symbol} yet.</p>
              ) : (
                <div className="space-y-2">
                  {symbolOrders.slice(0, 8).map(o => (
                    <div key={o.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                      <span>
                        <Badge variant={o.side === "buy" ? "default" : "destructive"} className="mr-2">{o.side.toUpperCase()}</Badge>
                        {o.quantity} @ {o.average_fill_price ? `${currencySymbol}${o.average_fill_price.toFixed(2)}` : o.limit_price ? `${currencySymbol}${o.limit_price.toFixed(2)}` : "market"}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline">{o.status}</Badge>
                        {o.status === "pending" && (
                          <Button size="sm" variant="ghost" onClick={() => cancelOrder(o.id)}>Cancel</Button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TradingErrorBoundary>
  );
};

export default MobileTrade;
