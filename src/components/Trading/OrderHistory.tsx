import { Card } from "@/components/ui/card";

interface Order {
  id: string;
  type: "market" | "limit" | "stop";
  action: "buy" | "sell";
  symbol: string;
  shares: number;
  price: number;
  status: "filled" | "pending" | "cancelled";
  timestamp: string;
}

const OrderHistory = () => {
  // Mock data - in a real app, this would come from an API
  const orders: Order[] = [
    {
      id: "1",
      type: "market",
      action: "buy",
      symbol: "AAPL",
      shares: 10,
      price: 150.50,
      status: "filled",
      timestamp: "2024-01-09T10:30:00Z",
    },
    {
      id: "2",
      type: "limit",
      action: "sell",
      symbol: "GOOGL",
      shares: 5,
      price: 2750.00,
      status: "pending",
      timestamp: "2024-01-09T11:15:00Z",
    },
  ];

  return (
    <Card className="p-6 card-gradient">
      <h2 className="text-xl font-semibold mb-4">Order History</h2>
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex justify-between items-center p-3 rounded-lg bg-background/50"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{order.symbol}</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    order.action === "buy"
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {order.action.toUpperCase()}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    order.status === "filled"
                      ? "bg-green-500/10 text-green-500"
                      : order.status === "pending"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {order.shares} shares @ ${order.price.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {new Date(order.timestamp).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.type.toUpperCase()} Order
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default OrderHistory;