import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";
import { MobileOrderForm, type OrderData } from "./MobileOrderForm";
import { MobileOrderConfirmation } from "./MobileOrderConfirmation";
import { MobileStockChart } from "./MobileStockChart";
import { useRealtimeStockData } from "@/hooks/useRealtimeStockData";
import { useDemoPrice } from "@/hooks/useDemoPrice";
import { useOrders, type Order } from "@/hooks/useOrders";
import { useHaptic } from "@/hooks/useHaptic";
import { toast } from "sonner";
import { isDemoSync } from "@/services/demo/DemoBackend";
import { DEMO_USER_ID, loadDemoState, subscribeDemoState, walletBalance } from "@/services/demo/demoStore";
import { generateChartData, getPairDef, getStockDef } from "@/services/demo/demoMarket";
import { DemoSpot } from "@/services/demo/demoExchange";
import type { SpotOrder } from "@/services/SpotTradingService";

interface MobileTradingInterfaceProps {
  symbol: string;
  companyName: string;
  currentPrice: number;
  priceChange?: number;
  priceChangePercent?: number;
  availableBalance?: number;
  onOrderSubmit?: (order: OrderData) => Promise<void>;
}

interface ChartPoint {
  time: string;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

const TIMEFRAME_POINTS: Record<string, number> = {
  "1D": 48,
  "1W": 56,
  "1M": 60,
  "3M": 90,
  "1Y": 120,
};

/** Resolve a bare crypto symbol ('BTC') or pair id ('BTC-USDT') to a demo pair id. */
function resolvePairId(symbol: string): string | null {
  if (getPairDef(symbol)) return symbol;
  for (const quote of ["USDT", "ZMW"]) {
    const candidate = `${symbol}-${quote}`;
    if (getPairDef(candidate)) return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Presentational shell — header, tabs, order form, confirmation sheet.
// All data and order handling are supplied by the demo/live wrappers below.
// ---------------------------------------------------------------------------

interface TradingShellProps {
  symbol: string;
  companyName: string;
  currencySymbol: string;
  displayPrice: number;
  displayChange: number;
  displayChangePercent: number;
  chartData: ChartPoint[];
  onTimeframeChange: (timeframe: string) => void;
  availableBalance: number;
  ordersContent: ReactNode;
  onOrderSubmit: (order: OrderData) => Promise<void>;
}

const TradingShell = ({
  symbol,
  companyName,
  currencySymbol,
  displayPrice,
  displayChange,
  displayChangePercent,
  chartData,
  onTimeframeChange,
  availableBalance,
  ordersContent,
  onOrderSubmit,
}: TradingShellProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<OrderData | null>(null);
  const { trigger } = useHaptic();

  const isPositive = displayChange >= 0;

  const handleOrderSubmit = (orderData: OrderData) => {
    trigger("medium");
    setPendingOrder(orderData);
    setShowConfirmation(true);
  };

  const handleOrderConfirm = async () => {
    if (!pendingOrder) return;
    // The wrapper's handler performs the real (demo or Supabase) placement and
    // throws on failure so the confirmation sheet can show its error state.
    await onOrderSubmit(pendingOrder);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Stock Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 space-y-3">
          <div>
            <h1 className="text-2xl font-bold">{symbol}</h1>
            <p className="text-sm text-muted-foreground">{companyName}</p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold">{currencySymbol}{displayPrice.toFixed(2)}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className="gap-1"
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isPositive ? "+" : ""}
                  {displayChange.toFixed(2)} ({isPositive ? "+" : ""}
                  {displayChangePercent.toFixed(2)}%)
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Tabs */}
      <Tabs defaultValue="trade" className="w-full">
        <TabsList className="w-full h-12 grid grid-cols-3 sticky top-[120px] z-10 bg-background">
          <TabsTrigger value="trade" className="text-base">
            Trade
          </TabsTrigger>
          <TabsTrigger value="chart" className="text-base">
            <Activity className="h-4 w-4 mr-2" />
            Chart
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-base">
            <Clock className="h-4 w-4 mr-2" />
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trade" className="mt-0 p-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Place Order</CardTitle>
            </CardHeader>
            <CardContent>
              <MobileOrderForm
                symbol={symbol}
                currentPrice={displayPrice}
                availableBalance={availableBalance}
                currencySymbol={currencySymbol}
                onSubmit={handleOrderSubmit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="mt-0 p-4">
          <MobileStockChart
            symbol={symbol}
            data={chartData}
            onTimeframeChange={onTimeframeChange}
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-0 p-4">
          {ordersContent}
        </TabsContent>
      </Tabs>

      {/* Order Confirmation Bottom Sheet */}
      <MobileOrderConfirmation
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          setPendingOrder(null);
        }}
        orderData={pendingOrder}
        symbol={symbol}
        currentPrice={displayPrice}
        currencySymbol={currencySymbol}
        onConfirm={handleOrderConfirm}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared orders list for stock-style orders (useOrders shape)
// ---------------------------------------------------------------------------

const StockOrdersList = ({
  orders,
  currencySymbol,
  onCancel,
}: {
  orders: Order[];
  currencySymbol: string;
  onCancel: (orderId: string) => void;
}) => {
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No orders yet — your orders for this symbol will appear here
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        {orders.slice(0, 10).map((o) => (
          <div key={o.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
            <span>
              <Badge variant={o.side === "buy" ? "default" : "destructive"} className="mr-2">
                {o.side.toUpperCase()}
              </Badge>
              {o.quantity} @ {o.average_fill_price
                ? `${currencySymbol}${o.average_fill_price.toFixed(2)}`
                : o.limit_price
                  ? `${currencySymbol}${o.limit_price.toFixed(2)}`
                  : "market"}
            </span>
            <span className="flex items-center gap-2">
              <Badge variant="outline">{o.status}</Badge>
              {o.status === "pending" && (
                <Button size="sm" variant="ghost" onClick={() => onCancel(o.id)}>Cancel</Button>
              )}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Demo implementation — every value comes from the demo service layer
// (demoMarket price engine + demoStore/demoExchange state). No Supabase
// queries and no external websockets are touched on this path, so the page
// renders fully whether or not any external service is reachable.
// ---------------------------------------------------------------------------

const DemoTradingInterface = (props: MobileTradingInterfaceProps) => {
  const { symbol, companyName } = props;
  const [timeframe, setTimeframe] = useState("1D");
  const { price: demoPrice, changePct } = useDemoPrice(symbol);
  const { orders, cancelOrder, createOrder } = useOrders();

  const stockDef = getStockDef(symbol);
  const pairId = useMemo(() => (stockDef ? null : resolvePairId(symbol)), [symbol, stockDef]);
  const pairDef = pairId ? getPairDef(pairId) : undefined;
  const isStock = !!stockDef;

  const displayPrice = demoPrice ?? props.currentPrice;
  const displayChange = (displayPrice * changePct) / 100;
  const currency = stockDef?.currency ?? pairDef?.quote ?? "USD";
  const currencySymbol = currency === "ZMW" ? "K" : "$";

  const chartData = useMemo<ChartPoint[]>(
    () => generateChartData(symbol, TIMEFRAME_POINTS[timeframe] ?? 60),
    // Regenerate when the live tick moves so the last candle tracks the quote.
    [symbol, timeframe, demoPrice],
  );

  // Demo cash (stocks) / quote-wallet balance (crypto), kept live via the
  // demo store's change events.
  const stockCurrency = stockDef?.currency;
  const stockCash = useSyncExternalStore(
    subscribeDemoState,
    () => (stockCurrency ? loadDemoState().stockCash[stockCurrency] : 0),
  );
  const quoteCurrency = pairDef?.quote;
  const quoteBalance = useSyncExternalStore(
    subscribeDemoState,
    () => (quoteCurrency ? walletBalance(quoteCurrency, "spot").available : 0),
  );
  const availableBalance = props.availableBalance ?? (isStock ? stockCash : quoteBalance);

  // Crypto spot orders for this pair, refreshed on demo-state changes.
  const [spotOrders, setSpotOrders] = useState<SpotOrder[]>([]);
  useEffect(() => {
    if (!pairId) {
      setSpotOrders([]);
      return;
    }
    const read = () =>
      setSpotOrders(DemoSpot.getOrderHistory(DEMO_USER_ID, 50).filter((o) => o.pair_id === pairId));
    read();
    return subscribeDemoState(read);
  }, [pairId]);

  const handleOrderSubmit = async (order: OrderData) => {
    if (props.onOrderSubmit) {
      await props.onOrderSubmit(order);
      return;
    }
    if (isStock) {
      // Routes through OrderExecutionEngine via DemoStockTrading; the page's
      // position/orders sections read the same store and update immediately.
      await createOrder({
        symbol,
        side: order.type,
        order_type: order.orderType,
        quantity: order.quantity,
        limit_price: order.limitPrice,
        time_in_force: "day",
      });
      return;
    }
    if (pairId) {
      const r = DemoSpot.placeOrder(
        DEMO_USER_ID,
        pairId,
        order.type,
        order.orderType,
        order.quantity,
        order.limitPrice,
      );
      if (!r.success) throw new Error(r.error || "Order failed");
      toast.success("Order placed successfully");
      return;
    }
    throw new Error("This instrument is not tradable in demo mode");
  };

  const handleCancelSpot = (orderId: string) => {
    const r = DemoSpot.cancelOrder(orderId);
    if (r.success) toast.success("Order cancelled");
    else toast.error(r.error || "Failed to cancel order");
  };

  const ordersContent = isStock ? (
    <StockOrdersList
      orders={orders.filter((o) => o.symbol === symbol)}
      currencySymbol={currencySymbol}
      onCancel={(id) => void cancelOrder(id)}
    />
  ) : (
    <Card>
      <CardContent className="p-4">
        {spotOrders.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No orders yet — your orders for this pair will appear here
          </div>
        ) : (
          <div className="space-y-2">
            {spotOrders.slice(0, 10).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                <span>
                  <Badge variant={o.side === "buy" ? "default" : "destructive"} className="mr-2">
                    {o.side.toUpperCase()}
                  </Badge>
                  {o.quantity} @ {o.average_fill_price
                    ? `${currencySymbol}${o.average_fill_price.toFixed(2)}`
                    : o.price
                      ? `${currencySymbol}${o.price.toFixed(2)}`
                      : "market"}
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{o.status}</Badge>
                  {(o.status === "open" || o.status === "partially_filled") && (
                    <Button size="sm" variant="ghost" onClick={() => handleCancelSpot(o.id)}>Cancel</Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <TradingShell
      symbol={symbol}
      companyName={companyName}
      currencySymbol={currencySymbol}
      displayPrice={displayPrice}
      displayChange={displayChange}
      displayChangePercent={changePct}
      chartData={chartData}
      onTimeframeChange={setTimeframe}
      availableBalance={availableBalance}
      ordersContent={ordersContent}
      onOrderSubmit={handleOrderSubmit}
    />
  );
};

// ---------------------------------------------------------------------------
// Live implementation — signed-in path. Uses the realtime hook (Supabase
// market_data + Finnhub) as before, but every value falls back to the
// props/demo-seeded numbers while loading or if the feed returns nothing,
// so a failed feed degrades the page instead of crashing it.
// ---------------------------------------------------------------------------

const LiveTradingInterface = (props: MobileTradingInterfaceProps) => {
  const { symbol, companyName } = props;
  const [timeframe, setTimeframe] = useState("1D");
  const realtime = useRealtimeStockData(symbol, timeframe);
  const { orders, cancelOrder, createOrder } = useOrders();

  const loaded = !realtime.isLoading;
  const displayPrice = loaded && realtime.currentPrice > 0 ? realtime.currentPrice : props.currentPrice;
  const displayChange = loaded ? realtime.priceChange : (props.priceChange ?? 0);
  const displayChangePercent = loaded ? realtime.priceChangePercent : (props.priceChangePercent ?? 0);

  const handleOrderSubmit = async (order: OrderData) => {
    if (props.onOrderSubmit) {
      await props.onOrderSubmit(order);
      return;
    }
    await createOrder({
      symbol,
      side: order.type,
      order_type: order.orderType,
      quantity: order.quantity,
      limit_price: order.limitPrice,
      time_in_force: "day",
    });
  };

  return (
    <TradingShell
      symbol={symbol}
      companyName={companyName}
      currencySymbol="$"
      displayPrice={displayPrice}
      displayChange={displayChange}
      displayChangePercent={displayChangePercent}
      chartData={realtime.chartData}
      onTimeframeChange={setTimeframe}
      availableBalance={props.availableBalance ?? 0}
      ordersContent={
        <StockOrdersList
          orders={orders.filter((o) => o.symbol === symbol)}
          currencySymbol="$"
          onCancel={(id) => void cancelOrder(id)}
        />
      }
      onOrderSubmit={handleOrderSubmit}
    />
  );
};

// ---------------------------------------------------------------------------
// Entry point — demo mode is fully served by the local demo service layer;
// a live Supabase session keeps the original realtime path.
// ---------------------------------------------------------------------------

export const MobileTradingInterface = (props: MobileTradingInterfaceProps) => {
  const demo = isDemoSync();
  return demo ? <DemoTradingInterface {...props} /> : <LiveTradingInterface {...props} />;
};
