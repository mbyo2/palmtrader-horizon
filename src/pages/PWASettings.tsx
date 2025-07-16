import { useState, useEffect } from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Smartphone, 
  Download, 
  Bell, 
  Settings, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Shield,
  Zap
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWASettings = () => {
  const { isLoading } = useProtectedRoute();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notifications, setNotifications] = useState({
    enabled: false,
    permission: 'default' as NotificationPermission
  });
  const [pwaFeatures, setPwaFeatures] = useState({
    offline: false,
    backgroundSync: false,
    pushNotifications: false
  });

  useEffect(() => {
    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check notification permission
    if ('Notification' in window) {
      setNotifications(prev => ({
        ...prev,
        permission: Notification.permission,
        enabled: Notification.permission === 'granted'
      }));
    }

    // Check PWA features
    setPwaFeatures({
      offline: 'serviceWorker' in navigator,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      pushNotifications: 'serviceWorker' in navigator && 'PushManager' in window
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
        toast({
          title: "App Installed!",
          description: "Palm Cacia has been installed on your device.",
        });
      }
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: "Unable to install the app. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!enabled) {
      setNotifications(prev => ({ ...prev, enabled: false }));
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifications({
        enabled: permission === 'granted',
        permission
      });

      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive important updates from Palm Cacia.",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "You can enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable notifications.",
        variant: "destructive",
      });
    }
  };

  const refreshApp = () => {
    window.location.reload();
  };

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PWA Settings</h1>
          <p className="text-muted-foreground">
            Manage your Progressive Web App preferences and features
          </p>
        </div>
        <Badge variant={isOnline ? "default" : "destructive"} className="gap-2">
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* App Installation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            App Installation
          </CardTitle>
          <CardDescription>
            Install Palm Cacia on your device for the best experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">App Installed</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Palm Cacia is installed on your device
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Installed
              </Badge>
            </div>
          ) : installPrompt ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Install Palm Cacia</p>
                <p className="text-sm text-muted-foreground">
                  Add to your home screen for quick access and offline support
                </p>
              </div>
              <Button onClick={handleInstallApp} className="gap-2">
                <Download className="h-4 w-4" />
                Install App
              </Button>
            </div>
          ) : (
            <div className="p-4 border rounded-lg">
              <p className="font-medium">Installation Available</p>
              <p className="text-sm text-muted-foreground">
                Use your browser's menu to install Palm Cacia on your device
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Get notified about important market updates and account activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive price alerts, trade confirmations, and market news
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notifications.enabled}
              onCheckedChange={handleNotificationToggle}
            />
          </div>
          {notifications.permission === 'denied' && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PWA Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            PWA Features
          </CardTitle>
          <CardDescription>
            Available Progressive Web App capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4" />
                <div>
                  <p className="font-medium">Offline Support</p>
                  <p className="text-xs text-muted-foreground">View cached data when offline</p>
                </div>
              </div>
              <Badge variant={pwaFeatures.offline ? "default" : "secondary"}>
                {pwaFeatures.offline ? "Available" : "Not Available"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4" />
                <div>
                  <p className="font-medium">Background Sync</p>
                  <p className="text-xs text-muted-foreground">Sync data when connection returns</p>
                </div>
              </div>
              <Badge variant={pwaFeatures.backgroundSync ? "default" : "secondary"}>
                {pwaFeatures.backgroundSync ? "Available" : "Not Available"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4" />
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive notifications when app is closed</p>
                </div>
              </div>
              <Badge variant={pwaFeatures.pushNotifications ? "default" : "secondary"}>
                {pwaFeatures.pushNotifications ? "Available" : "Not Available"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            App Management
          </CardTitle>
          <CardDescription>
            Manage your app settings and data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Refresh App</p>
              <p className="text-sm text-muted-foreground">
                Reload the app to get the latest updates
              </p>
            </div>
            <Button variant="outline" onClick={refreshApp} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Clear Cache</p>
              <p className="text-sm text-muted-foreground">
                Clear stored data and cached files
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => {
                if ('caches' in window) {
                  caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                  });
                }
                toast({
                  title: "Cache Cleared",
                  description: "App cache has been cleared successfully.",
                });
              }}
            >
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWASettings;