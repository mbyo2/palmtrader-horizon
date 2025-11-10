import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PriceAlert {
  id: string;
  symbol: string;
  target_price: number;
  condition: "above" | "below";
  is_triggered: boolean;
  is_active: boolean;
}

const PriceAlertList = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('price-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_alerts'
        },
        () => {
          fetchAlerts();
        }
      );

    // Subscribe with error handling
    channel.subscribe((status, err) => {
      if (err) {
        console.warn('Price alerts subscription error:', err);
      }
    });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('Error removing price alerts channel:', error);
      }
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Type assertion to ensure data matches PriceAlert interface
      setAlerts((data || []) as PriceAlert[]);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from("price_alerts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Price alert deleted successfully",
      });

      setAlerts(alerts.filter(alert => alert.id !== id));
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast({
        title: "Error",
        description: "Failed to delete price alert",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Your Price Alerts</h3>
      {alerts.length === 0 ? (
        <p className="text-muted-foreground">No price alerts set</p>
      ) : (
        alerts.map((alert) => (
          <Card key={alert.id} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <Bell className={`h-4 w-4 ${alert.is_triggered ? "text-green-500" : "text-muted-foreground"}`} />
                  <span className="font-semibold">{alert.symbol}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Alert when price goes {alert.condition} ${alert.target_price}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteAlert(alert.id)}
                className="text-destructive hover:text-destructive/90"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default PriceAlertList;