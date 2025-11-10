import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { 
    data: notifications = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    staleTime: 10 * 1000, // 10 seconds
  });

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const setupSubscription = async () => {
      try {
        const channel = supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            () => {
              queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
            }
          );

        // Subscribe with proper promise handling
        channel.subscribe((status, err) => {
          if (err) {
            console.warn('Notifications real-time subscription failed:', err);
          }
          if (status === 'SUBSCRIBED') {
            console.log('Notifications subscription established');
          }
        });

        return channel;
      } catch (error) {
        console.warn('Failed to set up notifications subscription:', error);
        return null;
      }
    };

    const channelPromise = setupSubscription();

    return () => {
      channelPromise.then(channel => {
        if (channel) {
          try {
            supabase.removeChannel(channel);
          } catch (error) {
            console.warn('Error removing notifications channel:', error);
          }
        }
      }).catch(err => {
        console.warn('Error during cleanup:', err);
      });
    };
  }, [user, queryClient]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;
    
    await queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
    
    await queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
};