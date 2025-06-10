
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { 
  Bell, 
  Download, 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Monitor,
  RefreshCw
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAManager: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'installing' | 'active' | 'waiting' | 'error'>('installing');

  const {
    isSupported: notificationsSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendLocalNotification
  } = usePushNotifications();

  useEffect(() => {
    // Check if app is installed
    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for online/offline status
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    const handleOfflineStatus = () => setIsOnline(false);

    // Check service worker status
    const checkServiceWorkerStatus = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration.active) {
            setServiceWorkerStatus('active');
          } else if (registration.waiting) {
            setServiceWorkerStatus('waiting');
          }
        } catch (error) {
          setServiceWorkerStatus('error');
        }
      }
    };

    checkInstallation();
    checkServiceWorkerStatus();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  const testNotification = async () => {
    await sendLocalNotification({
      title: 'Test Notification',
      body: 'This is a test notification from PalmCacia!',
      icon: '/icon-192.png',
      tag: 'test'
    });
  };

  const getServiceWorkerStatusBadge = () => {
    switch (serviceWorkerStatus) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'waiting':
        return <Badge className="bg-yellow-500">Waiting</Badge>;
      case 'installing':
        return <Badge className="bg-blue-500">Installing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Progressive Web App
          </CardTitle>
          <CardDescription>
            Manage your PWA installation and offline capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Installation Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span>App Installation</span>
            </div>
            {isInstalled ? (
              <Badge className="bg-green-500">Installed</Badge>
            ) : (
              <>
                {installPrompt ? (
                  <Button onClick={handleInstall} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Install App
                  </Button>
                ) : (
                  <Badge variant="outline">Not Available</Badge>
                )}
              </>
            )}
          </div>

          {/* Online Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span>Connection Status</span>
            </div>
            <Badge className={isOnline ? "bg-green-500" : "bg-red-500"}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* Service Worker Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>Service Worker</span>
            </div>
            {getServiceWorkerStatusBadge()}
          </div>

          {!isOnline && (
            <Alert>
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                You're currently offline. Some features may be limited, but cached content is still available.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Manage your notification preferences and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!notificationsSupported ? (
            <Alert>
              <AlertDescription>
                Push notifications are not supported in this browser.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Enable Push Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive important updates about your portfolio and trades
                  </div>
                </div>
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handleNotificationToggle}
                  disabled={isLoading || permission === 'denied'}
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Permission Status</span>
                <Badge 
                  className={
                    permission === 'granted' ? 'bg-green-500' : 
                    permission === 'denied' ? 'bg-red-500' : 
                    'bg-yellow-500'
                  }
                >
                  {permission}
                </Badge>
              </div>

              {permission === 'denied' && (
                <Alert>
                  <AlertDescription>
                    Notifications are blocked. Please enable them in your browser settings to receive important updates.
                  </AlertDescription>
                </Alert>
              )}

              {isSubscribed && (
                <Button onClick={testNotification} variant="outline" size="sm">
                  Send Test Notification
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAManager;
