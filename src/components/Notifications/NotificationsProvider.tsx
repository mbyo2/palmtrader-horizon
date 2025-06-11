import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { pushNotificationService } from '@/services/PushNotificationService';
import NotificationTriggers from './NotificationTriggers';

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
  isPushEnabled: boolean;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
  isPushEnabled: false,
  enablePush: async () => {},
  disablePush: async () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    try {
      const isSubscribed = await pushNotificationService.isSubscribed();
      setIsPushEnabled(isSubscribed);
    } catch (error) {
      console.error('Error checking push status:', error);
    }
  };

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

    // Send push notification if enabled and browser supports it
    if (isPushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      pushNotificationService.sendLocalNotification({
        title: notification.title,
        body: notification.message,
        icon: '/icon-192.png',
        tag: notification.type,
        data: notification.data
      });
    }
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

  // Enable push notifications
  const enablePush = async () => {
    try {
      const permission = await pushNotificationService.requestPermission();
      if (permission === 'granted') {
        await pushNotificationService.subscribeToPush();
        setIsPushEnabled(true);
        
        // Schedule background sync for offline support
        await pushNotificationService.scheduleBackgroundSync('sync-notifications');
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
    }
  };

  // Disable push notifications
  const disablePush = async () => {
    try {
      await pushNotificationService.unsubscribeFromPush();
      setIsPushEnabled(false);
    } catch (error) {
      console.error('Error disabling push notifications:', error);
    }
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
            filter: `user_id=eq.${session.session.user.id} AND is_triggered=eq.true`,
          },
          (payload) => {
            console.log('Price alert triggered:', payload);
            const alert = payload.new;
            
            // Only notify for alerts that haven't been notified yet
            if (!alert.is_notified) {
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
                .update({ is_triggered: true })
                .eq('id', alert.id)
                .then(({ error }) => {
                  if (error) console.error('Error updating price alert:', error);
                });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    handlePriceAlert();
  }, [isPushEnabled]);

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
  }, [isPushEnabled]);

  const contextValue = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isPushEnabled,
    enablePush,
    disablePush,
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      <NotificationTriggers />
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
