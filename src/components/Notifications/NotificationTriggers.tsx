
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pushNotificationService } from '@/services/PushNotificationService';

const NotificationTriggers = () => {
  useEffect(() => {
    const setupNotificationTriggers = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      // Listen for price alerts being triggered
      const priceAlertsChannel = supabase
        .channel('price_alerts_notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'price_alerts',
            filter: `user_id=eq.${session.session.user.id} AND is_triggered=eq.true`,
          },
          async (payload) => {
            const alert = payload.new;
            console.log('Price alert triggered, sending notification:', alert);
            
            try {
              await pushNotificationService.sendPushNotification(
                session.session!.user.id,
                {
                  title: `Price Alert: ${alert.symbol}`,
                  body: `${alert.symbol} has ${alert.condition === 'above' ? 'risen above' : 'fallen below'} your target price of $${alert.target_price}`,
                  icon: '/icon-192.png',
                  tag: 'price-alert',
                  url: `/markets?symbol=${alert.symbol}`,
                  data: {
                    type: 'price-alert',
                    symbol: alert.symbol,
                    targetPrice: alert.target_price,
                    condition: alert.condition
                  }
                }
              );
            } catch (error) {
              console.error('Failed to send price alert notification:', error);
            }
          }
        )
        .subscribe();

      // Listen for trade confirmations
      const tradesChannel = supabase
        .channel('trades_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trades',
            filter: `user_id=eq.${session.session.user.id}`,
          },
          async (payload) => {
            const trade = payload.new;
            console.log('Trade executed, sending notification:', trade);
            
            try {
              await pushNotificationService.sendPushNotification(
                session.session!.user.id,
                {
                  title: `Trade Executed: ${trade.symbol}`,
                  body: `Your ${trade.type} order for ${trade.shares} shares of ${trade.symbol} at $${trade.price} has been executed`,
                  icon: '/icon-192.png',
                  tag: 'trade-confirmation',
                  url: '/portfolio',
                  data: {
                    type: 'trade-confirmation',
                    tradeId: trade.id,
                    symbol: trade.symbol,
                    tradeType: trade.type,
                    shares: trade.shares,
                    price: trade.price
                  }
                }
              );
            } catch (error) {
              console.error('Failed to send trade confirmation notification:', error);
            }
          }
        )
        .subscribe();

      // Listen for portfolio updates
      const portfolioChannel = supabase
        .channel('portfolio_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'portfolio',
            filter: `user_id=eq.${session.session.user.id}`,
          },
          async (payload) => {
            const position = payload.new;
            console.log('New portfolio position, sending notification:', position);
            
            try {
              await pushNotificationService.sendPushNotification(
                session.session!.user.id,
                {
                  title: `New Position: ${position.symbol}`,
                  body: `You now hold ${position.shares} shares of ${position.symbol} at an average price of $${position.average_price}`,
                  icon: '/icon-192.png',
                  tag: 'portfolio-update',
                  url: '/portfolio',
                  data: {
                    type: 'portfolio-update',
                    symbol: position.symbol,
                    shares: position.shares,
                    averagePrice: position.average_price
                  }
                }
              );
            } catch (error) {
              console.error('Failed to send portfolio update notification:', error);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(priceAlertsChannel);
        supabase.removeChannel(tradesChannel);
        supabase.removeChannel(portfolioChannel);
      };
    };

    setupNotificationTriggers();
  }, []);

  return null;
};

export default NotificationTriggers;
