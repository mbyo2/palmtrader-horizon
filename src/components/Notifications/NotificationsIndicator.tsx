
import React from 'react';
import { useNotifications } from './NotificationsProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Bell, BellDot, BellOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const NotificationsIndicator: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const { isSupported, permission, isSubscribed } = usePushNotifications();

  // Function to render notification icon based on status and unread count
  const renderNotificationIcon = () => {
    // Show different states based on push notification status
    if (!isSupported || permission === 'denied') {
      return (
        <div className="relative">
          <BellOff className="h-5 w-5 text-muted-foreground" />
        </div>
      );
    }

    if (unreadCount > 0) {
      return (
        <div className="relative">
          <BellDot className="h-5 w-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 rounded-full px-1 min-w-[1.2rem] h-5 text-xs font-bold flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        </div>
      );
    }

    return (
      <div className="relative">
        <Bell className="h-5 w-5" />
        {isSubscribed && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
        )}
      </div>
    );
  };

  // Get notification icon color based on type
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'price-alert':
        return 'text-amber-500';
      case 'trade-confirmation':
        return 'text-green-500';
      case 'system':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    if (!isSupported) return 'Not supported';
    if (permission === 'denied') return 'Blocked';
    if (!isSubscribed) return 'Disabled';
    return 'Active';
  };

  const getStatusColor = () => {
    if (!isSupported || permission === 'denied') return 'destructive';
    if (!isSubscribed) return 'secondary';
    return 'default';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          {renderNotificationIcon()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Notifications</h4>
            <Badge variant={getStatusColor()} className="text-xs">
              {getStatusText()}
            </Badge>
          </div>
          <div className="flex space-x-1">
            <Button 
              onClick={markAllAsRead} 
              size="sm" 
              variant="ghost" 
              className="text-xs h-7"
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
            <Button 
              onClick={clearNotifications} 
              size="sm" 
              variant="ghost" 
              className="text-xs h-7"
              disabled={notifications.length === 0}
            >
              Clear all
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-xs mt-1">You'll see important updates here</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 border-b hover:bg-muted/50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-muted/30' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h5 className={`font-medium text-sm ${getNotificationColor(notification.type)}`}>
                      {notification.title}
                    </h5>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notification.timestamp), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {(!isSupported || permission === 'denied' || !isSubscribed) && (
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">
              {!isSupported 
                ? 'Your browser doesn\'t support push notifications'
                : permission === 'denied'
                ? 'Notifications are blocked. Enable them in your browser settings.'
                : 'Enable push notifications for real-time updates'
              }
            </p>
            {isSupported && permission !== 'denied' && (
              <Button size="sm" variant="outline" className="w-full text-xs">
                Enable Notifications
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsIndicator;
