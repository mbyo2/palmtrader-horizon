
import { useEffect, useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";

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
  
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    },
    enabled: !!user
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

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Order History</h2>
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
                    <Badge
                      variant={
                        order.status === 'completed'
                          ? 'default'
                          : order.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
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
