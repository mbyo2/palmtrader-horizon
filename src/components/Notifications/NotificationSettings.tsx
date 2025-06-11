
import React from 'react';
import { useNotifications } from './NotificationsProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Bell, BellOff, Smartphone, Clock } from 'lucide-react';

const NotificationSettings: React.FC = () => {
  const { isPushEnabled, enablePush, disablePush } = useNotifications();
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    requestPermission, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  const [settings, setSettings] = React.useState({
    priceAlerts: true,
    tradeConfirmations: true,
    portfolioUpdates: true,
    marketNews: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  const handleTogglePush = async () => {
    if (isPushEnabled) {
      await disablePush();
      toast({
        title: 'Push notifications disabled',
        description: 'You will no longer receive push notifications.',
      });
    } else {
      await enablePush();
      toast({
        title: 'Push notifications enabled',
        description: 'You will now receive push notifications.',
      });
    }
  };

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: 'Setting updated',
      description: `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} has been updated.`,
    });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications. Please use a modern browser for the best experience.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Manage your push notification preferences and settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive real-time notifications about your investments
              </p>
            </div>
            <Switch
              checked={isPushEnabled}
              onCheckedChange={handleTogglePush}
              disabled={isLoading}
            />
          </div>

          {permission !== 'granted' && !isPushEnabled && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4" />
                <span className="font-medium">Permission Required</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                To receive push notifications, you need to grant permission in your browser.
              </p>
              <Button onClick={requestPermission} disabled={isLoading}>
                Grant Permission
              </Button>
            </div>
          )}

          {isPushEnabled && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Bell className="h-4 w-4" />
                <span className="font-medium">Push notifications are active</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Price Alerts</Label>
              <p className="text-sm text-muted-foreground">
                When your price alerts are triggered
              </p>
            </div>
            <Switch
              checked={settings.priceAlerts}
              onCheckedChange={(checked) => handleSettingChange('priceAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Trade Confirmations</Label>
              <p className="text-sm text-muted-foreground">
                When your trades are executed
              </p>
            </div>
            <Switch
              checked={settings.tradeConfirmations}
              onCheckedChange={(checked) => handleSettingChange('tradeConfirmations', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Portfolio Updates</Label>
              <p className="text-sm text-muted-foreground">
                Significant changes to your portfolio
              </p>
            </div>
            <Switch
              checked={settings.portfolioUpdates}
              onCheckedChange={(checked) => handleSettingChange('portfolioUpdates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Market News</Label>
              <p className="text-sm text-muted-foreground">
                Important market updates and news
              </p>
            </div>
            <Switch
              checked={settings.marketNews}
              onCheckedChange={(checked) => handleSettingChange('marketNews', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Pause notifications during specified hours
              </p>
            </div>
            <Switch
              checked={settings.quietHoursEnabled}
              onCheckedChange={(checked) => handleSettingChange('quietHoursEnabled', checked)}
            />
          </div>

          {settings.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select 
                  value={settings.quietHoursStart} 
                  onValueChange={(value) => handleSettingChange('quietHoursStart', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>End Time</Label>
                <Select 
                  value={settings.quietHoursEnd} 
                  onValueChange={(value) => handleSettingChange('quietHoursEnd', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
