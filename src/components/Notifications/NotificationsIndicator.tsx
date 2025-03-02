
import React from 'react';
import { useNotifications } from './NotificationsProvider';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Bell, BellDot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const NotificationsIndicator: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

  // Function to render notification icon based on unread count
  const renderNotificationIcon = () => {
    if (unreadCount > 0) {
      return (
        <div className="relative">
          <BellDot className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white text-xs font-bold px-1 min-w-[1.2rem] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      );
    }
    return <Bell className="h-5 w-5" />;
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          {renderNotificationIcon()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-2 border-b">
          <h4 className="font-semibold">Notifications</h4>
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
              No notifications yet
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
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsIndicator;
