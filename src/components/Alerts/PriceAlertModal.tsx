
import React, { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, DollarSign } from "lucide-react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

interface PriceAlertModalProps {
  symbol: string;
  currentPrice: number;
  children: React.ReactNode;
}

const PriceAlertModal: React.FC<PriceAlertModalProps> = ({ symbol, currentPrice, children }) => {
  const [open, setOpen] = useState(false);
  const [alertPrice, setAlertPrice] = useState(currentPrice.toString());
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { handleAuthRequired } = useAuthRedirect();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is logged in
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setOpen(false);
      handleAuthRequired("Please sign in to set price alerts");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const userId = session.session.user.id;
      const targetPrice = parseFloat(alertPrice);
      
      if (isNaN(targetPrice) || targetPrice <= 0) {
        toast({
          title: "Invalid price",
          description: "Please enter a valid price",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Check if alert already exists for this symbol and condition
      const { data: existingAlerts } = await supabase
        .from('price_alerts')
        .select()
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .eq('condition', condition)
        .eq('is_active', true);
        
      if (existingAlerts && existingAlerts.length > 0) {
        // Update existing alert
        const { error } = await supabase
          .from('price_alerts')
          .update({
            target_price: targetPrice,
            updated_at: new Date().toISOString(),
            is_triggered: false,
            is_notified: false,
          })
          .eq('id', existingAlerts[0].id);
          
        if (error) throw error;
        
        toast({
          title: "Alert updated",
          description: `You'll be notified when ${symbol} goes ${condition} $${targetPrice}`,
        });
      } else {
        // Create new alert
        const { error } = await supabase
          .from('price_alerts')
          .insert({
            user_id: userId,
            symbol,
            target_price: targetPrice,
            condition,
            is_active: true,
            is_triggered: false,
            is_notified: false,
          });
          
        if (error) throw error;
        
        toast({
          title: "Alert created",
          description: `You'll be notified when ${symbol} goes ${condition} $${targetPrice}`,
        });
      }
      
      setOpen(false);
    } catch (error) {
      console.error("Error setting price alert:", error);
      toast({
        title: "Error",
        description: "Failed to set price alert",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Set Price Alert for {symbol}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="condition">Alert Condition</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={condition === 'above' ? 'default' : 'outline'}
                onClick={() => setCondition('above')}
                className="flex-1"
              >
                Price Goes Above
              </Button>
              <Button
                type="button"
                variant={condition === 'below' ? 'default' : 'outline'}
                onClick={() => setCondition('below')}
                className="flex-1"
              >
                Price Goes Below
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="price">Alert Price</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.01"
                value={alertPrice}
                onChange={(e) => setAlertPrice(e.target.value)}
                className="pl-8"
                placeholder="Enter price"
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Current price: ${currentPrice.toFixed(2)}
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Setting..." : "Set Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PriceAlertModal;
