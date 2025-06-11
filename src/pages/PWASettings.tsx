
import React, { useState } from 'react';
import PWAManager from '@/components/PWA/PWAManager';
import NotificationSettings from '@/components/Notifications/NotificationSettings';
import PWAOnboarding from '@/components/PWA/PWAOnboarding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

const PWASettings: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">PWA & Notifications</h1>
            <p className="text-muted-foreground">
              Manage your Progressive Web App settings and notification preferences
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowOnboarding(true)}
            className="gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Help & Tour
          </Button>
        </div>
      </div>

      {showOnboarding ? (
        <PWAOnboarding onComplete={() => setShowOnboarding(false)} />
      ) : (
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="pwa">PWA Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
          
          <TabsContent value="pwa">
            <PWAManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default PWASettings;
