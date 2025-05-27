
import { useEffect, useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { TradingService } from "@/services/TradingService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Order {
  id: string;
  type: string;
  order_type: string;
  symbol: string;
  shares: number;
  price: number;
  status: string;
  created_at: string;
  limit_price?: number;
  stop_price?: number;
  trailing_percent?: number;
  total_amount: number;
}

const OrderHistory = () => {
  const { user } = useAuth();
  
  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['orderHistory', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await TradingService.getOrderHistory(user.id, 100);
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getOrderTypeDisplay = (order: Order) => {
    switch (order.order_type) {
      case 'market':
        return 'Market Order';
      case 'limit':
        return `Limit ${order.type.toUpperCase()} @ $${order.limit_price}`;
      case 'stop':
        return `Stop ${order.type.toUpperCase()} @ $${order.stop_price}`;
      case 'stop_limit':
        return `Stop-Limit ${order.type.toUpperCase()} @ $${order.stop_price}/$${order.limit_price}`;
      case 'trailing_stop':
        return `Trailing Stop ${order.type.toUpperCase()} @ ${order.trailing_percent}%`;
      default:
        return order.order_type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Order History</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Refresh
        </Button>
      </div>
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No orders to display
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex justify-between items-start p-4 rounded-lg bg-background/50 border"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{order.symbol}</span>
                    <Badge
                      variant={order.type === 'buy' ? 'default' : 'destructive'}
                    >
                      {order.type.toUpperCase()}
                    </Badge>
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getOrderTypeDisplay(order)}
                  </p>
                  <p className="text-sm">
                    {order.shares} shares @ ${order.price.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: ${order.total_amount.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default OrderHistory;
