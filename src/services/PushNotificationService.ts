import { supabase } from '@/integrations/supabase/client';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
}

class PushNotificationService {
  private vapidPublicKey = 'BKuM-FH8VrLJB6q6eT1fLbYkP-9X7ZrI_Q6FQNrXBrNgd6E_Mm_N3tBrQ7gJ8VLx9_K6dFr7gNm1_7fJ9R0h8Qw';
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (!('serviceWorker' in navigator)) {
      throw new Error('This browser does not support service workers');
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('Push subscription created:', subscription);
      await this.savePushSubscription(subscription);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  async unsubscribeFromPush(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await this.removePushSubscription();
        console.log('Unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting push subscription:', error);
      return null;
    }
  }

  async isSubscribed(): Promise<boolean> {
    const subscription = await this.getSubscription();
    return subscription !== null;
  }

  private async savePushSubscription(subscription: PushSubscription): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.retryAttempts) {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          throw new Error('User not authenticated');
        }

        const subscriptionData: PushSubscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
          }
        };

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: session.session.user.id,
            subscription_data: subscriptionData as any,
            is_active: true
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          throw error;
        }

        console.log('Push subscription saved to database');
        return;
      } catch (error) {
        attempts++;
        console.error(`Error saving push subscription (attempt ${attempts}):`, error);
        
        if (attempts >= this.retryAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
      }
    }
  }

  private async removePushSubscription(): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.retryAttempts) {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          throw new Error('User not authenticated');
        }

        const { error } = await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('user_id', session.session.user.id);

        if (error) {
          throw error;
        }

        console.log('Push subscription removed from database');
        return;
      } catch (error) {
        attempts++;
        console.error(`Error removing push subscription (attempt ${attempts}):`, error);
        
        if (attempts >= this.retryAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
      }
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/icon-192.png',
          tag: payload.tag,
          data: payload.data
        });
      } catch (error) {
        console.error('Error creating local notification:', error);
      }
    }
  }

  async sendPushNotification(userId: string, notification: NotificationPayload): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.retryAttempts) {
      try {
        const { error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            userId,
            notification
          }
        });

        if (error) {
          throw error;
        }

        console.log('Push notification sent successfully');
        return;
      } catch (error) {
        attempts++;
        console.error(`Error sending push notification (attempt ${attempts}):`, error);
        
        if (attempts >= this.retryAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
      }
    }
  }

  async sendPushNotificationToMultipleUsers(userIds: string[], notification: NotificationPayload): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.retryAttempts) {
      try {
        const { error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            userIds,
            notification
          }
        });

        if (error) {
          throw error;
        }

        console.log('Push notifications sent successfully');
        return;
      } catch (error) {
        attempts++;
        console.error(`Error sending push notifications (attempt ${attempts}):`, error);
        
        if (attempts >= this.retryAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
      }
    }
  }

  async scheduleBackgroundSync(tag: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register(tag);
        console.log('Background sync scheduled:', tag);
      }
    } catch (error) {
      console.error('Error scheduling background sync:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
