
import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellDot, AlertCircle, ArrowUp, ArrowDown, DollarSign } from "lucide-react";

// Define notification types
export type NotificationType = 'price-alert' | 'trade-confirmation' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  timestamp: Date;
  data?: any;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Function to add a new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      isRead: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 100)); // Limit to 100 notifications
    
    // Show toast for the new notification
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'system' ? 'default' : 
               notification.type === 'price-alert' ? 
               (notification.data?.direction === 'above' ? 'destructive' : 'default') : 
               'default',
    });
  };

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Listen for price alerts from the database
  useEffect(() => {
    const handlePriceAlert = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      // Subscribe to realtime updates for triggered price alerts
      const channel = supabase
        .channel('price_alerts_channel')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'price_alerts',
            filter: `user_id=eq.${session.session.user.id} AND is_triggered=eq.true AND is_notified=eq.false`,
          },
          (payload) => {
            console.log('Price alert triggered:', payload);
            const alert = payload.new;
            
            // Add notification for the triggered alert
            addNotification({
              type: 'price-alert',
              title: `Price Alert: ${alert.symbol}`,
              message: `${alert.symbol} has reached your target price of $${alert.target_price}`,
              data: {
                symbol: alert.symbol,
                price: alert.target_price,
                direction: alert.condition,
              },
            });

            // Mark alert as notified
            supabase
              .from('price_alerts')
              .update({ is_notified: true })
              .eq('id', alert.id)
              .then(({ error }) => {
                if (error) console.error('Error updating price alert:', error);
              });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    handlePriceAlert();
  }, []);

  // Listen for trade confirmations
  useEffect(() => {
    const handleTradeConfirmation = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      // Subscribe to realtime updates for new trades
      const channel = supabase
        .channel('trades_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trades',
            filter: `user_id=eq.${session.session.user.id}`,
          },
          (payload) => {
            console.log('Trade confirmed:', payload);
            const trade = payload.new;
            
            // Add notification for the new trade
            addNotification({
              type: 'trade-confirmation',
              title: `Trade Confirmation: ${trade.symbol}`,
              message: `Your ${trade.type} order for ${trade.shares} shares of ${trade.symbol} at $${trade.price} has been executed.`,
              data: trade,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    handleTradeConfirmation();
  }, []);

  const contextValue = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
};
