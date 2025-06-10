
import React from 'react';
import PWAManager from '@/components/PWA/PWAManager';

const PWASettings: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">PWA & Notifications</h1>
        <p className="text-muted-foreground">
          Manage your Progressive Web App settings and notification preferences
        </p>
      </div>
      
      <PWAManager />
    </div>
  );
};

export default PWASettings;
