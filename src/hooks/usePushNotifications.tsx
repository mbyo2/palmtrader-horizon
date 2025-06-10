
import { useState, useEffect } from 'react';
import { pushNotificationService, NotificationPayload } from '@/services/PushNotificationService';
import { toast } from '@/hooks/use-toast';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendLocalNotification: (payload: NotificationPayload) => Promise<void>;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkSupport = () => {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        checkSubscriptionStatus();
      }
    };

    checkSupport();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const subscribed = await pushNotificationService.isSubscribed();
      setIsSubscribed(subscribed);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const newPermission = await pushNotificationService.requestPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications for important updates.',
        });
      } else if (newPermission === 'denied') {
        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings to receive alerts.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to request notification permission.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = async () => {
    setIsLoading(true);
    try {
      if (permission !== 'granted') {
        await requestPermission();
        if (Notification.permission !== 'granted') {
          return;
        }
      }

      const subscription = await pushNotificationService.subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        toast({
          title: 'Push Notifications Enabled',
          description: 'You are now subscribed to push notifications.',
        });
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: 'Subscription Failed',
        description: 'Failed to subscribe to push notifications.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await pushNotificationService.unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
        toast({
          title: 'Unsubscribed',
          description: 'You have been unsubscribed from push notifications.',
        });
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to unsubscribe from push notifications.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendLocalNotification = async (payload: NotificationPayload) => {
    try {
      await pushNotificationService.sendLocalNotification(payload);
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
};
